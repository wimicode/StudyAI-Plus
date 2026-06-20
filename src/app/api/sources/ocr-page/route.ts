import { NextRequest, NextResponse } from 'next/server'
import { visionOcr, VisionOcrError } from '@/lib/ai/client'

// L'inférence vision peut prendre 15-40s. Le défaut Vercel Hobby est de 10s
// — on l'étend au maximum autorisé (60s sur Hobby) pour éviter les coupures
// silencieuses en plein milieu de l'appel.
export const maxDuration = 60

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
    // Propage le vrai code HTTP (ex: 429 rate limit) pour que le client
    // puisse réagir correctement (retry automatique côté navigateur).
    if (err instanceof VisionOcrError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    const message = err instanceof Error ? err.message : 'Erreur OCR inconnue'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
