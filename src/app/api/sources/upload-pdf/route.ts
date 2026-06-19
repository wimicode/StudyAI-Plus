import { NextRequest, NextResponse } from 'next/server'
import { pdf } from 'pdf-to-img'
import { visionOcr } from '@/lib/ai/client'

const MAX_OCR_PAGES = 15 // limite de sécurité (coût/temps) pour le fallback vision

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier reçu' }, { status: 400 })
    if (file.type !== 'application/pdf')
      return NextResponse.json({ error: 'Seuls les fichiers PDF sont acceptés' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024)
      return NextResponse.json({ error: 'Fichier trop lourd (max 10 Mo)' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    // 1. Tentative rapide : texte numérique natif du PDF (gratuit, instantané)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)
    const nativeText = (data.text || '').trim()

    if (nativeText.length >= 20) {
      return NextResponse.json({
        text: nativeText,
        pages: data.numpages,
        filename: file.name,
        method: 'text', // texte numérique trouvé directement
      })
    }

    // 2. Fallback OCR vision : le PDF est probablement scanné ou manuscrit.
    //    On rend chaque page en image puis on l'envoie à un modèle de vision.
    const doc = await pdf(buffer, { scale: 2.0 })
    const pageCount = doc.length

    if (pageCount > MAX_OCR_PAGES) {
      return NextResponse.json({
        error: `Ce PDF scanné fait ${pageCount} pages — la limite pour la lecture par IA est de ${MAX_OCR_PAGES} pages.`,
      }, { status: 422 })
    }

    const pageTexts: string[] = []
    let pageIndex = 0
    for await (const pageImage of doc) {
      pageIndex++
      const base64 = pageImage.toString('base64')
      try {
        const text = await visionOcr(base64)
        if (text) pageTexts.push(`[Page ${pageIndex}]\n${text}`)
      } catch (ocrErr) {
        console.error(`[upload-pdf] OCR échoué page ${pageIndex}`, ocrErr)
      }
    }

    const ocrText = pageTexts.join('\n\n').trim()
    if (!ocrText) {
      return NextResponse.json({
        error: "Impossible de lire ce PDF, même avec l'IA de vision (image illisible, vide, ou trop dégradée).",
      }, { status: 422 })
    }

    return NextResponse.json({
      text: ocrText,
      pages: pageCount,
      filename: file.name,
      method: 'vision-ocr', // lu via IA de vision (scan/manuscrit)
    })
  } catch (err) {
    console.error('[upload-pdf]', err)
    return NextResponse.json({ error: 'Erreur lors de la lecture du PDF' }, { status: 500 })
  }
}
