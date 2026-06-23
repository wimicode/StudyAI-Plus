'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed'

export default function GenerateExamPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questionCount, setQuestionCount] = useState(10)
  const [difficulty, setDifficulty] = useState<Difficulty>('mixed')
  const [durationMinutes, setDurationMinutes] = useState(60)
  const [instructions, setInstructions] = useState('')

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/courses/${id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ exam: { questionCount, difficulty, durationMinutes, instructions } }),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/dashboard/courses/${id}/exam`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">📝 Générer un crash test</h1>
      <p className="text-ink-400 text-sm mb-8">Choisis les paramètres pour ce cours.</p>

      <div className="card space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Nb. questions</label>
            <input type="number" min={3} max={40} value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))} className="input" />
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Difficulté</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)} className="input">
              <option value="mixed">Mélangée</option>
              <option value="easy">Facile</option>
              <option value="medium">Moyenne</option>
              <option value="hard">Difficile</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-ink-400 mb-1 block">Durée (min)</label>
            <input type="number" min={15} max={180} step={15} value={durationMinutes}
              onChange={e => setDurationMinutes(Number(e.target.value))} className="input" />
          </div>
        </div>
        <div>
          <label className="text-xs text-ink-400 mb-1 block">Instructions facultatives</label>
          <input placeholder="ex : style examen universitaire" value={instructions}
            onChange={e => setInstructions(e.target.value)} className="input" />
        </div>
      </div>

      {error && (
        <p className="text-rust-600 text-sm bg-rust-500/8 border border-rust-500/20 rounded-xl px-4 py-3 mt-4">
          {error}
        </p>
      )}

      <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full py-4 text-base mt-6">
        {loading ? '⏳ Génération en cours...' : '✨ Générer le crash test'}
      </button>
      <button onClick={() => router.push(`/dashboard/courses/${id}`)} className="btn-ghost w-full mt-2">
        Annuler
      </button>
    </div>
  )
}
