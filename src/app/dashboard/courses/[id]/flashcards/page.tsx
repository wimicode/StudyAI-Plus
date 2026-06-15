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

  if (loading) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-white">⏳</div>
  if (cards.length === 0) return (
    <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center text-white gap-4">
      <p>Aucune flashcard disponible.</p>
      <Link href={`/dashboard/courses/${id}`} className="text-purple-400 underline">Retour au cours</Link>
    </div>
  )

  const card = cards[current]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-purple-900 text-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <Link href={`/dashboard/courses/${id}`} className="text-purple-300 hover:text-white">← Retour</Link>
          <span className="text-purple-300 text-sm">{current + 1} / {cards.length} • {mastered.size} maîtrisées</span>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-3xl p-8 text-center cursor-pointer select-none min-h-64 flex flex-col items-center justify-center transition-all hover:bg-white/15"
          onClick={() => setFlipped(f => !f)}>
          <div className="text-xs text-purple-400 mb-4">{flipped ? '🔙 Verso' : '📌 Recto'} — cliquer pour retourner</div>
          <p className="text-xl font-semibold leading-relaxed">{flipped ? card.back : card.front}</p>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={() => { setCurrent(c => Math.max(0, c - 1)); setFlipped(false) }}
            disabled={current === 0}
            className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 py-3 rounded-xl transition-all">
            ← Préc
          </button>
          <button onClick={toggleMastered}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              mastered.has(current) ? 'bg-green-600 hover:bg-green-500' : 'bg-white/10 hover:bg-white/20'
            }`}>
            {mastered.has(current) ? '✅ Maîtrisée' : '⭐ Maîtriser'}
          </button>
          <button onClick={() => { setCurrent(c => Math.min(cards.length - 1, c + 1)); setFlipped(false) }}
            disabled={current === cards.length - 1}
            className="flex-1 bg-white/10 hover:bg-white/20 disabled:opacity-30 py-3 rounded-xl transition-all">
            Suiv →
          </button>
        </div>

        <div className="mt-4 bg-white/5 rounded-full h-2">
          <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${((current + 1) / cards.length) * 100}%` }} />
        </div>
      </div>
    </div>
  )
}
