'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ExamContent, Generation } from '@/types'

type GradeResult = { questionId: string; score: number; maxPoints: number; feedback: string }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ExamPage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [activeGen, setActiveGen] = useState<Generation | null>(null)
  const [loading, setLoading] = useState(true)

  const [started, setStarted] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [grading, setGrading] = useState(false)
  const [gradeError, setGradeError] = useState<string | null>(null)
  const [results, setResults] = useState<GradeResult[] | null>(null)
  const [totalScore, setTotalScore] = useState(0)
  const [totalMax, setTotalMax] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('generations').select('*')
        .eq('course_id', id).eq('type', 'exam')
        .order('created_at', { ascending: false })
      setGenerations((data as Generation[]) || [])
      setLoading(false)
    }
    load()
  }, [id, supabase])

  useEffect(() => {
    if (!started || submitted) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { handleSubmit(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, submitted])

  async function handleSubmit() {
    if (!activeGen) return
    setSubmitted(true)
    setGrading(true)
    setGradeError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`/api/courses/${id}/grade-exam`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ answers, generationId: activeGen.id }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setResults(data.results)
      setTotalScore(data.totalScore)
      setTotalMax(data.totalMax)
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : 'Erreur lors de la correction')
    } finally {
      setGrading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-400">⏳ Chargement...</div>

  if (generations.length === 0) return (
    <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
      <div className="text-5xl">📝</div>
      <p className="text-ink-500">Aucun crash test disponible pour ce cours.</p>
      <Link href={`/dashboard/courses/${id}/generate/exam`} className="btn-primary px-6 py-3">
        ✨ Générer un crash test
      </Link>
    </div>
  )

  // ── Liste de sélection ──
  if (!activeGen) return (
    <div className="animate-fade-in max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link href={`/dashboard/courses/${id}`} className="text-ink-400 hover:text-ink-700 transition-colors">← Retour</Link>
        <h1 className="font-serif text-xl text-ink-800">📝 Crash Test</h1>
      </div>

      <div className="space-y-3">
        {generations.map((gen, i) => {
          const content = gen.content as ExamContent
          const qCount = content.sections.reduce((sum, s) => sum + s.questions.length, 0)
          return (
            <button key={gen.id}
              onClick={() => {
                setActiveGen(gen); setStarted(false); setSubmitted(false)
                setAnswers({}); setResults(null)
                setSecondsLeft(content.duration * 60)
              }}
              className="card w-full text-left hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all"
              style={{ transform: `rotate(${i % 2 === 0 ? '-0.3deg' : '0.25deg'})` }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-800">{gen.title}</p>
                  <p className="text-ink-400 text-xs mt-1">{formatDate(gen.created_at)} • {qCount} questions</p>
                </div>
                <span className="text-ink-300 text-xl">→</span>
              </div>
            </button>
          )
        })}
      </div>

      <Link href={`/dashboard/courses/${id}/generate/exam`}
        className="btn-secondary w-full py-3 mt-4 inline-block text-center">
        + Générer un nouveau crash test
      </Link>
    </div>
  )

  const exam = activeGen.content as ExamContent
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const totalQuestions = exam.sections.reduce((sum, s) => sum + s.questions.length, 0)
  const answeredCount = Object.keys(answers).length

  if (!started) {
    return (
      <div className="max-w-xl mx-auto animate-fade-in">
        <button onClick={() => setActiveGen(null)} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">← Tous les crash tests</button>
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
      <div className="max-w-xl mx-auto animate-fade-in">
        <div className="card rotate-[0.3deg] text-center mb-6">
          <div className="text-5xl mb-3">{grading ? '⏳' : '✅'}</div>
          <h2 className="font-serif text-2xl font-semibold text-ink-800 mb-2">
            {grading ? 'Correction en cours...' : 'Crash test corrigé'}
          </h2>
          {!grading && results && (
            <p className="font-serif text-3xl text-primary-600 font-semibold mb-1">
              {totalScore.toFixed(1)} / {totalMax}
            </p>
          )}
          {grading && <p className="text-ink-400 text-sm">L&apos;IA analyse tes réponses ouvertes, ça peut prendre quelques instants.</p>}
          {gradeError && <p className="text-rust-600 text-sm mt-2">{gradeError}</p>}
        </div>

        {results && (
          <div className="space-y-3 mb-6">
            {exam.sections.flatMap(s => s.questions).map((q) => {
              const r = results.find(res => res.questionId === q.id)
              if (!r) return null
              const full = r.score >= r.maxPoints
              const zero = r.score === 0
              return (
                <div key={q.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-ink-700 text-sm leading-relaxed">{q.question}</p>
                    <span className={`badge shrink-0 ${full ? 'bg-brand-100 text-brand-700' : zero ? 'bg-rust-500/10 text-rust-600' : 'bg-primary-100 text-primary-700'}`}>
                      {r.score % 1 === 0 ? r.score : r.score.toFixed(1)} / {r.maxPoints}
                    </span>
                  </div>
                  <p className="text-ink-400 text-xs">{r.feedback}</p>
                </div>
              )
            })}
          </div>
        )}

        <button onClick={() => setActiveGen(null)} className="btn-primary w-full py-3">
          Retour aux crash tests
        </button>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setActiveGen(null)} className="text-ink-400 hover:text-ink-700 transition-colors text-sm">← Quitter</button>
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

      <button onClick={handleSubmit} className="btn-primary w-full py-4 mt-6 text-base">
        Terminer le crash test
      </button>
    </div>
  )
}
