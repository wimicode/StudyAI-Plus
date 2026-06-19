import { NextRequest, NextResponse } from 'next/server'
import { visionOcr } from '@/lib/ai/client'

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      return NextResponse.json({ error: 'Aucune image reçue' }, { status: 400 })
    }
    const text = await visionOcr(imageBase64, 'image/jpeg')
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[ocr-page]', err)
    const message = err instanceof Error ? err.message : 'Erreur OCR inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
