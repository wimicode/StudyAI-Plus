'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ExamContent } from '@/types'

export default function ExamPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [exam, setExam] = useState<ExamContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('courses').select('exam_content').eq('id', id).single()
      const content = data?.exam_content as ExamContent | null
      setExam(content)
      if (content) setSecondsLeft(content.duration * 60)
      setLoading(false)
    }
    load()
  }, [id, supabase])

  useEffect(() => {
    if (!started || submitted) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { setSubmitted(true); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [started, submitted])

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-400">⏳ Chargement...</div>

  if (!exam) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl">📝</div>
      <p className="text-ink-500">Aucun crash test disponible pour ce cours.</p>
      <Link href={`/dashboard/courses/${id}/generate`} className="btn-primary px-6 py-3">
        ✨ Générer un crash test
      </Link>
    </div>
  )

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0)
  const answeredCount = Object.keys(answers).length

  if (!started) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">← Retour</Link>
        <div className="card mt-4 -rotate-[0.3deg] text-center">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="font-serif text-2xl font-semibold text-ink-800 mb-2">{exam.title}</h1>
          <p className="text-ink-400 mb-1">{totalQuestions} questions • {exam.duration} minutes</p>
          {exam.instructions && <p className="text-ink-500 text-sm mt-4 leading-relaxed">{exam.instructions}</p>}
          <button onClick={() => setStarted(true)} className="btn-primary w-full py-3 mt-6">
            Démarrer le crash test
          </button>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center animate-fade-in">
        <div className="card rotate-[0.3deg]">
          <div className="text-5xl mb-3">✅</div>
          <h2 className="font-serif text-2xl font-semibold text-ink-800 mb-2">Crash test terminé</h2>
          <p className="text-ink-400 mb-6">
            {answeredCount} / {totalQuestions} questions répondues
          </p>
          <p className="text-ink-500 text-sm mb-6">
            C&apos;est un entraînement en conditions réelles — relis tes réponses avec ton cours pour t&apos;auto-corriger.
          </p>
          <Link href={`/dashboard/courses/${id}`} className="btn-primary px-6 py-3 inline-block">Retour au cours</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">← Quitter</Link>
        <div className={`font-mono text-sm px-3 py-1 rounded-full ${secondsLeft < 60 ? 'bg-rust-500/15 text-rust-600' : 'bg-paper-200 text-ink-600'}`}>
          ⏱️ {minutes}:{seconds.toString().padStart(2, '0')}
        </div>
      </div>

      <p className="text-ink-400 text-sm mb-4">{answeredCount} / {totalQuestions} répondues</p>

      <div className="space-y-6">
        {exam.sections.map((section, sIdx) => (
          <div key={sIdx}>
            <h2 className="font-serif text-lg text-ink-800 mb-3">{section.title}</h2>
            <div className="space-y-4">
              {section.questions.map((q) => (
                <div key={q.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-ink-700 leading-relaxed">{q.question}</p>
                    <span className="badge bg-paper-200 text-ink-500 shrink-0">{q.points} pt{q.points > 1 ? 's' : ''}</span>
                  </div>

                  {q.type === 'open' ? (
                    <textarea
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder="Ta réponse..."
                      rows={3}
                      className="input resize-none"
                    />
                  ) : (
                    <div className="space-y-2">
                      {(q.options ?? []).map(opt => (
                        <button key={opt}
                          onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                          className={`w-full text-left px-4 py-2.5 rounded-lg border transition-all ${
                            answers[q.id] === opt
                              ? 'border-primary-400 bg-primary-50 text-ink-800'
                              : 'border-ink-700/15 hover:bg-paper-200/60'
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={() => setSubmitted(true)} className="btn-primary w-full py-4 mt-6 text-base">
        Terminer le crash test
      </button>
    </div>
  )
}
