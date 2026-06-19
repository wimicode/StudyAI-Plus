import { NextRequest, NextResponse } from 'next/server'

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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse')
    const data = await pdfParse(buffer)

    if (!data.text || data.text.trim().length < 20)
      return NextResponse.json({ error: 'Impossible d\'extraire du texte de ce PDF (scan ou PDF image ?)' }, { status: 422 })

    return NextResponse.json({
      text: data.text.trim(),
      pages: data.numpages,
      filename: file.name,
    })
  } catch (err) {
    console.error('[upload-pdf]', err)
    return NextResponse.json({ error: 'Erreur lors de la lecture du PDF' }, { status: 500 })
  }
}
