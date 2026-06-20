'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed'

export default function GenerateCoursePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Flashcards
  const [wantFlashcards, setWantFlashcards] = useState(true)
  const [fcCount, setFcCount] = useState(20)
  const [fcDifficulty, setFcDifficulty] = useState<Difficulty>('mixed')
  const [fcInstructions, setFcInstructions] = useState('')

  // Quiz
  const [wantQuiz, setWantQuiz] = useState(true)
  const [quizCount, setQuizCount] = useState(10)
  const [quizDifficulty, setQuizDifficulty] = useState<Difficulty>('mixed')
  const [quizChoices, setQuizChoices] = useState(4)
  const [quizInstructions, setQuizInstructions] = useState('')

  // Crash test
  const [wantExam, setWantExam] = useState(false)
  const [examDuration, setExamDuration] = useState(60)
  const [examInstructions, setExamInstructions] = useState('')

  async function handleGenerate() {
    if (!wantFlashcards && !wantQuiz && !wantExam) {
      setError('Sélectionne au moins une chose à générer.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const body: Record<string, unknown> = {}
      if (wantFlashcards) body.flashcards = { count: fcCount, difficulty: fcDifficulty, instructions: fcInstructions }
      if (wantQuiz) body.quiz = { count: quizCount, difficulty: quizDifficulty, numChoices: quizChoices, instructions: quizInstructions }
      if (wantExam) body.exam = { durationMinutes: examDuration, instructions: examInstructions }

      const res = await fetch(`/api/courses/${id}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(await res.text())
      router.push(`/dashboard/courses/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">Que veux-tu réviser ?</h1>
      <p className="text-ink-400 text-sm mb-8">
        Choisis ce que l&apos;IA doit préparer pour ce cours — décoche ce qui ne t&apos;intéresse pas.
      </p>

      <div className="space-y-5">

        {/* ── Flashcards ── */}
        <div className={`card transition-opacity ${!wantFlashcards ? 'opacity-50' : ''}`}>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={wantFlashcards} onChange={e => setWantFlashcards(e.target.checked)}
              className="w-5 h-5 rounded accent-primary-500" />
            <span className="text-2xl">🃏</span>
            <h2 className="font-serif text-lg text-ink-800">Flashcards</h2>
          </label>

          {wantFlashcards && (
            <div className="space-y-3 pl-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Nombre de cartes</label>
                  <input type="number" min={5} max={60} value={fcCount}
                    onChange={e => setFcCount(Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Difficulté</label>
                  <select value={fcDifficulty} onChange={e => setFcDifficulty(e.target.value as Difficulty)} className="input">
                    <option value="mixed">Mélangée</option>
                    <option value="easy">Facile</option>
                    <option value="medium">Moyenne</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>
              </div>
              <input placeholder="Instructions facultatives (ex : insiste sur les dates)"
                value={fcInstructions} onChange={e => setFcInstructions(e.target.value)} className="input" />
            </div>
          )}
        </div>

        {/* ── Quiz ── */}
        <div className={`card transition-opacity ${!wantQuiz ? 'opacity-50' : ''}`}>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={wantQuiz} onChange={e => setWantQuiz(e.target.checked)}
              className="w-5 h-5 rounded accent-primary-500" />
            <span className="text-2xl">❓</span>
            <h2 className="font-serif text-lg text-ink-800">Quiz</h2>
          </label>

          {wantQuiz && (
            <div className="space-y-3 pl-2">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Nb. questions</label>
                  <input type="number" min={3} max={40} value={quizCount}
                    onChange={e => setQuizCount(Number(e.target.value))} className="input" />
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Difficulté</label>
                  <select value={quizDifficulty} onChange={e => setQuizDifficulty(e.target.value as Difficulty)} className="input">
                    <option value="mixed">Mélangée</option>
                    <option value="easy">Facile</option>
                    <option value="medium">Moyenne</option>
                    <option value="hard">Difficile</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-ink-400 mb-1 block">Choix par question</label>
                  <select value={quizChoices} onChange={e => setQuizChoices(Number(e.target.value))} className="input">
                    <option value={2}>2 (vrai/faux)</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                </div>
              </div>
              <input placeholder="Instructions facultatives (ex : questions style examen)"
                value={quizInstructions} onChange={e => setQuizInstructions(e.target.value)} className="input" />
            </div>
          )}
        </div>

        {/* ── Crash test ── */}
        <div className={`card transition-opacity ${!wantExam ? 'opacity-50' : ''}`}>
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={wantExam} onChange={e => setWantExam(e.target.checked)}
              className="w-5 h-5 rounded accent-primary-500" />
            <span className="text-2xl">📝</span>
            <h2 className="font-serif text-lg text-ink-800">Crash test (examen blanc)</h2>
          </label>

          {wantExam && (
            <div className="space-y-3 pl-2">
              <div>
                <label className="text-xs text-ink-400 mb-1 block">Durée (minutes)</label>
                <input type="number" min={15} max={180} step={15} value={examDuration}
                  onChange={e => setExamDuration(Number(e.target.value))} className="input max-w-[140px]" />
              </div>
              <input placeholder="Instructions facultatives (ex : style examen universitaire)"
                value={examInstructions} onChange={e => setExamInstructions(e.target.value)} className="input" />
            </div>
          )}
        </div>

        {error && (
          <p className="text-rust-600 text-sm bg-rust-500/8 border border-rust-500/20 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        <button onClick={handleGenerate} disabled={loading} className="btn-primary w-full py-4 text-base">
          {loading ? '⏳ Génération en cours...' : '✨ Générer'}
        </button>
        <button onClick={() => router.push(`/dashboard/courses/${id}`)} className="btn-ghost w-full">
          Passer pour l&apos;instant — j&apos;y reviendrai plus tard
        </button>
      </div>
    </div>
  )
}
