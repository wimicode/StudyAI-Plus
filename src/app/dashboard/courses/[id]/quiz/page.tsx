'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { QuizQuestion, Generation } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function QuizPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [activeGen, setActiveGen] = useState<Generation | null>(null)
  const [loading, setLoading] = useState(true)

  const [current, setCurrent] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('generations').select('*')
        .eq('course_id', id).eq('type', 'quiz')
        .order('created_at', { ascending: false })
      setGenerations((data as Generation[]) || [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-400">⏳ Chargement...</div>

  if (generations.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl">❓</div>
      <p className="text-ink-500">Aucun quiz disponible pour ce cours.</p>
      <Link href={`/dashboard/courses/${id}/generate/quiz`} className="btn-primary px-6 py-3">
        ✨ Générer un quiz
      </Link>
    </div>
  )

  // ── Liste de sélection ──
  if (!activeGen) return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors">← Retour</Link>
        <h1 className="font-serif text-xl text-ink-800">❓ Quiz</h1>
      </div>

      <div className="space-y-3">
        {generations.map((gen, i) => (
          <button key={gen.id}
            onClick={() => { setActiveGen(gen); setCurrent(0); setSelectedOption(null); setAnswers({}); setFinished(false) }}
            className="card w-full text-left hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all"
            style={{ transform: `rotate(${i % 2 === 0 ? '-0.3deg' : '0.25deg'})` }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink-800">{gen.title}</p>
                <p className="text-ink-400 text-xs mt-1">{formatDate(gen.created_at)} • {(gen.content as QuizQuestion[]).length} questions</p>
              </div>
              <span className="text-ink-300 text-xl">→</span>
            </div>
          </button>
        ))}
      </div>

      <Link href={`/dashboard/courses/${id}/generate/quiz`}
        className="btn-secondary w-full py-3 mt-4 inline-block text-center">
        + Générer un nouveau quiz
      </Link>
    </div>
  )

  const questions = activeGen.content as QuizQuestion[]

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
            <button onClick={() => { setCurrent(0); setAnswers({}); setSelectedOption(null); setFinished(false) }}
              className="btn-secondary px-6 py-3">🔁 Refaire</button>
            <button onClick={() => setActiveGen(null)} className="btn-primary px-6 py-3">Autres quiz</button>
          </div>
        </div>
      </div>
    )
  }

  const q = questions[current]
  const isAnswered = selectedOption !== null

  function selectAnswer(option: string) {
    if (isAnswered) return
    setSelectedOption(option)
    setAnswers(prev => ({ ...prev, [current]: option }))
  }

  function next() {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
      setSelectedOption(answers[current + 1] ?? null)
    } else {
      setFinished(true)
    }
  }

  return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setActiveGen(null)} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">← Tous les quiz</button>
        <span className="text-ink-400 text-sm">Question {current + 1} / {questions.length}</span>
      </div>

      <div className="card">
        <h2 className="font-serif text-lg text-ink-800 mb-5 leading-relaxed">{q.question}</h2>

        <div className="space-y-2.5">
          {q.options.map((opt) => {
            const isCorrectOption = opt === q.correct
            const isSelectedOption = opt === selectedOption
            // La bonne réponse s'affiche TOUJOURS en vert une fois qu'on a
            // répondu (même si on ne l'a pas choisie), et l'option choisie
            // à tort s'affiche en rouge — pour bien montrer où était l'erreur.
            let style = 'border-ink-700/15 hover:bg-paper-200/60'
            if (isAnswered && isCorrectOption) style = 'border-brand-500 bg-brand-50 text-brand-700'
            else if (isAnswered && isSelectedOption && !isCorrectOption) style = 'border-rust-500 bg-rust-500/8 text-rust-600'

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
