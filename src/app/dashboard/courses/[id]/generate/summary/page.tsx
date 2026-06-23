'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Length = 'short' | 'medium' | 'long'
type Precision = 'general' | 'detailed' | 'exhaustive'

export default function RegenerateSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [length, setLength] = useState<Length>('long')
  const [precision, setPrecision] = useState<Precision>('detailed')
  const [focusPoints, setFocusPoints] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/courses/${id}/regenerate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ length, precision, focusPoints }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/dashboard/courses/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">📄 Régénérer le résumé</h1>
      <p className="text-ink-400 text-sm mb-8">Ajuste la longueur, la précision et les points à privilégier.</p>

      <div className="card space-y-4">
        <div>
          <label className="text-xs text-ink-400 mb-1 block">Longueur</label>
          <select value={length} onChange={e => setLength(e.target.value as Length)} className="input">
            <option value="short">Courte (200-400 mots)</option>
            <option value="medium">Moyenne (500-900 mots)</option>
            <option value="long">Très complète (1200-2000+ mots)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-400 mb-1 block">Précision</label>
          <select value={precision} onChange={e => setPrecision(e.target.value as Precision)} className="input">
            <option value="general">Générale — vue d&apos;ensemble</option>
            <option value="detailed">Détaillée — définitions et chiffres précis</option>
            <option value="exhaustive">Exhaustive — rien n&apos;est omis</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-ink-400 mb-1 block">Points à privilégier (facultatif)</label>
          <input placeholder="ex : insiste sur les dates et les formules"
            value={focusPoints} onChange={e => setFocusPoints(e.target.value)} className="input" />
        </div>
      </div>

      {error && (
        <p className="text-rust-600 text-sm bg-rust-500/8 border border-rust-500/20 rounded-xl px-4 py-3 mt-4">
          {error}
        </p>
      )}

      <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full py-4 text-base mt-6">
        {loading ? '⏳ Génération en cours...' : '✨ Régénérer le résumé'}
      </button>
      <button onClick={() => router.push(`/dashboard/courses/${id}`)} className="btn-ghost w-full mt-2">
        Annuler
      </button>
    </div>
  )
}
