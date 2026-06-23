'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Flashcard, Generation } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function FlashcardsPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [selected, setSelected] = useState<Generation | null>(null)
  const [loading, setLoading] = useState(true)

  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('generations').select('*')
        .eq('course_id', id).eq('type', 'flashcards')
        .order('created_at', { ascending: false })
      setGenerations((data as Generation[]) || [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  function toggleMastered() {
    setMastered(prev => {
      const next = new Set(prev)
      next.has(current) ? next.delete(current) : next.add(current)
      return next
    })
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-400">⏳ Chargement...</div>

  if (generations.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl">🃏</div>
      <p className="text-ink-500">Aucune flashcard disponible pour ce cours.</p>
      <Link href={`/dashboard/courses/${id}/generate/flashcards`} className="btn-primary px-6 py-3">
        ✨ Générer des flashcards
      </Link>
    </div>
  )

  // ── Liste de sélection (si pas encore choisi un jeu précis) ──
  if (!selected) return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors">← Retour</Link>
        <h1 className="font-serif text-xl text-ink-800">🃏 Flashcards</h1>
      </div>

      <div className="space-y-3">
        {generations.map((gen, i) => (
          <button key={gen.id} onClick={() => { setSelected(gen); setCurrent(0); setFlipped(false); setMastered(new Set()) }}
            className="card w-full text-left hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all"
            style={{ transform: `rotate(${i % 2 === 0 ? '-0.3deg' : '0.25deg'})` }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink-800">{gen.title}</p>
                <p className="text-ink-400 text-xs mt-1">{formatDate(gen.created_at)} • {(gen.content as Flashcard[]).length} cartes</p>
              </div>
              <span className="text-ink-300 text-xl">→</span>
            </div>
          </button>
        ))}
      </div>

      <Link href={`/dashboard/courses/${id}/generate/flashcards`}
        className="btn-secondary w-full py-3 mt-4 inline-block text-center">
        + Générer un nouveau jeu de flashcards
      </Link>
    </div>
  )

  // ── Lecteur de cartes ──
  const cards = selected.content as Flashcard[]
  const card = cards[current]
  const cardTilt = current % 2 === 0 ? '-0.6deg' : '0.5deg'

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setSelected(null)} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">← Tous les jeux</button>
        <span className="text-ink-400 text-sm">{current + 1} / {cards.length} • {mastered.size} maîtrisées</span>
      </div>

      <div
        className="card text-center cursor-pointer select-none min-h-64 flex flex-col items-center justify-center hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all"
        style={{ transform: `rotate(${cardTilt})` }}
        onClick={() => setFlipped(f => !f)}
      >
        <div className="text-xs text-ink-400 mb-4">{flipped ? '🔙 Verso' : '📌 Recto'} — cliquer pour retourner</div>
        <p className="text-xl font-serif font-semibold leading-relaxed text-ink-800">{flipped ? card.back : card.front}</p>
      </div>

      <div className="flex gap-3 mt-6">
        <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }}
          disabled={current === 0}
          className="btn-secondary flex-1 py-3 disabled:opacity-30">
          ← Préc
        </button>
        <button onClick={toggleMastered}
          className={`flex-1 py-3 rounded-lg font-medium transition-all ${
            mastered.has(current)
              ? 'bg-brand-500 text-paper-50 hover:bg-brand-600'
              : 'btn-secondary'
          }`}>
          {mastered.has(current) ? '✅ Maîtrisée' : '⭐ Maîtriser'}
        </button>
        <button onClick={() => { setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }}
          disabled={current === cards.length - 1}
          className="btn-secondary flex-1 py-3 disabled:opacity-30">
          Suiv →
        </button>
      </div>

      <div className="mt-4 bg-paper-200 rounded-full h-2">
        <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${((current + 1) / cards.length) * 100}%` }} />
      </div>
    </div>
  )
}
