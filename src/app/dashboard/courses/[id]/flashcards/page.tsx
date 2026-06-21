'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Flashcard } from '@/types'

export default function FlashcardsPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [cards, setCards] = useState<Flashcard[]>([])
  const [current, setCurrent] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [mastered, setMastered] = useState<Set<number>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('courses').select('flashcards').eq('id', id).single()
      setCards((data?.flashcards as Flashcard[]) || [])
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

  if (cards.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl">🃏</div>
      <p className="text-ink-500">Aucune flashcard disponible pour ce cours.</p>
      <Link href={`/dashboard/courses/${id}/generate/flashcards`} className="btn-primary px-6 py-3">
        ✨ Générer des flashcards
      </Link>
    </div>
  )

  const card = cards[current]
  // Légère rotation sur la carte (pas d'info importante dessus), pour rappeler
  // l'esthétique fiche du reste du site — alternée selon l'index.
  const cardTilt = current % 2 === 0 ? '-0.6deg' : '0.5deg'

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors">← Retour</Link>
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
