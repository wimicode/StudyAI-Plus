'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { QuizQuestion } from '@/types'

export default function QuizPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('courses').select('quiz_questions').eq('id', id).single()
      setQuestions((data?.quiz_questions as QuizQuestion[]) || [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-400">⏳ Chargement...</div>

  if (questions.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl">❓</div>
      <p className="text-ink-500">Aucun quiz disponible pour ce cours.</p>
      <Link href={`/dashboard/courses/${id}/generate/quiz`} className="btn-primary px-6 py-3">
        ✨ Générer un quiz
      </Link>
    </div>
  )

  if (finished) {
    const correctCount = questions.filter((q, i) => answers[i] === q.correct).length
    const pct = Math.round((correctCount / questions.length) * 100)
    return (
      <div className="max-w-xl mx-auto text-center animate-fade-in">
        <div className="card -rotate-[0.4deg]">
          <div className="text-5xl mb-3">{pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '📚'}</div>
          <h2 className="font-serif text-2xl font-semibold text-ink-800 mb-2">
            {correctCount} / {questions.length} bonnes réponses
          </h2>
          <p className="text-ink-400 mb-6">{pct}% de réussite</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setCurrent(0); setAnswers({}); setSelected(null); setFinished(false) }}
              className="btn-secondary px-6 py-3">🔁 Refaire</button>
            <Link href={`/dashboard/courses/${id}`} className="btn-primary px-6 py-3">Retour au cours</Link>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const isAnswered = selected !== null

  function selectAnswer(option: string) {
    if (isAnswered) return
    setSelected(option)
    setAnswers(prev => ({ ...prev, [current]: option }))
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setSelected(answers[current + 1] ?? null)
    } else {
      setFinished(true)
    }
  }

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors">← Retour</Link>
        <span className="text-ink-400 text-sm">Question {current + 1} / {questions.length}</span>
      </div>

      <div className="card">
        <h2 className="font-serif text-lg text-ink-800 mb-5 leading-relaxed">{q.question}</h2>

        <div className="space-y-2.5">
          {q.options.map((opt) => {
            const isCorrect = opt === q.correct
            const isSelected = opt === selected
            let style = 'border-ink-700/15 hover:bg-paper-200/60'
            if (isAnswered && isCorrect) style = 'border-brand-500 bg-brand-50 text-brand-700'
            else if (isAnswered && isSelected && !isCorrect) style = 'border-rust-500 bg-rust-500/8 text-rust-600'

            return (
              <button key={opt} onClick={() => selectAnswer(opt)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${style}`}>
                {opt}
              </button>
            )
          })}
        </div>

        {isAnswered && q.explanation && (
          <p className="text-sm text-ink-500 bg-paper-200/60 rounded-lg px-4 py-3 mt-4">
            💡 {q.explanation}
          </p>
        )}
      </div>

      <button onClick={next} disabled={!isAnswered} className="btn-primary w-full py-3 mt-4 disabled:opacity-40">
        {current < questions.length - 1 ? 'Suivant →' : 'Voir le résultat'}
      </button>
    </div>
  )
}
