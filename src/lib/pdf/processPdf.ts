'use client'
// Traitement PDF entièrement côté navigateur (évite la limite de payload
// des fonctions Vercel : on n'envoie jamais le PDF brut au serveur).
//
// 1. extractNativeText() : essaie de lire le texte numérique natif du PDF
// 2. renderPageToJpeg() : si le texte natif est absent (PDF scanné/manuscrit),
//    rend une page en image JPEG compressée, prête à être envoyée à l'OCR vision

import * as pdfjsLib from 'pdfjs-dist'

let workerConfigured = false
function ensureWorker() {
  if (workerConfigured) return
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'
  workerConfigured = true
}

export type PdfProcessResult = {
  text: string
  pageCount: number
  method: 'text' | 'vision-ocr'
}

const MIN_NATIVE_TEXT_LENGTH = 20

async function loadPdf(file: File) {
  ensureWorker()
  const buffer = await file.arrayBuffer()
  return pdfjsLib.getDocument({ data: buffer }).promise
}

async function extractNativeText(file: File): Promise<{ text: string; pageCount: number }> {
  const doc = await loadPdf(file)
  const pageTexts: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = content.items.map((item: any) => item.str).join(' ')
    if (pageText.trim()) pageTexts.push(pageText.trim())
  }
  return { text: pageTexts.join('\n\n').trim(), pageCount: doc.numPages }
}

/** Rend une page du PDF en JPEG compressé (base64 sans préfixe data:) */
async function renderPageToJpeg(file: File, pageNumber: number, scale = 1.6, quality = 0.75): Promise<string> {
  const doc = await loadPdf(file)
  const page = await doc.getPage(pageNumber)
  const viewport = page.getViewport({ scale })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await page.render({ canvasContext: ctx, viewport } as any).promise

  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return dataUrl.split(',')[1] // retire le préfixe "data:image/jpeg;base64,"
}

/**
 * Traite un PDF entièrement côté navigateur :
 * - tente le texte natif
 * - sinon, rend chaque page en image et l'envoie à l'API OCR vision (1 page = 1 requête légère)
 */
export async function processPdfClientSide(
  file: File,
  onProgress?: (current: number, total: number) => void,
): Promise<PdfProcessResult> {
  const { text: nativeText, pageCount } = await extractNativeText(file)

  if (nativeText.length >= MIN_NATIVE_TEXT_LENGTH) {
    return { text: nativeText, pageCount, method: 'text' }
  }

  const MAX_OCR_PAGES = 15
  if (pageCount > MAX_OCR_PAGES) {
    throw new Error(`Ce PDF scanné fait ${pageCount} pages — la limite pour la lecture par IA est de ${MAX_OCR_PAGES} pages.`)
  }

  const pageTexts: string[] = []
  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(i, pageCount)
    const jpegBase64 = await renderPageToJpeg(file, i)

    const res = await fetch('/api/sources/ocr-page', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: jpegBase64 }),
      signal: AbortSignal.timeout(55_000), // évite un blocage indéfini si NVIDIA ne répond pas
    }).catch((err) => {
      if (err.name === 'TimeoutError') {
        throw new Error(`La lecture de la page ${i} a pris trop de temps (>55s) — réessaie, ou avec un PDF plus court.`)
      }
      throw err
    })

    let data: { text?: string; error?: string }
    try {
      data = await res.json()
    } catch {
      throw new Error(`Erreur serveur inattendue page ${i} (code ${res.status}).`)
    }
    if (!res.ok) throw new Error(data.error || `Erreur OCR page ${i}`)
    if (data.text) pageTexts.push(`[Page ${i}]\n${data.text}`)
  }

  const ocrText = pageTexts.join('\n\n').trim()
  if (!ocrText) {
    throw new Error("Impossible de lire ce PDF, même avec l'IA de vision (image illisible, vide, ou trop dégradée).")
  }

  return { text: ocrText, pageCount, method: 'vision-ocr' }
}
