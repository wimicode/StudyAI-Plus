import { createClient } from '@/lib/supabase/client'
import type { ExamContent } from '@/types'

type GradeResult = { questionId: string; score: number; maxPoints: number; feedback: string }

export default function ExamPage() {
const { id } = useParams<{ id: string }>()
const supabase = createClient()
const [exam, setExam] = useState<ExamContent | null>(null)
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
@@ -31,13 +38,40 @@ export default function ExamPage() {
if (!started || submitted) return
intervalRef.current = setInterval(() => {
setSecondsLeft(s => {
        if (s <= 1) { setSubmitted(true); return 0 }
        if (s <= 1) { handleSubmit(); return 0 }
return s - 1
})
}, 1000)
return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
}, [started, submitted])

  async function handleSubmit() {
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
        body: JSON.stringify({ answers }),
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

if (!exam) return (
@@ -74,18 +108,46 @@ export default function ExamPage() {

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

        <Link href={`/dashboard/courses/${id}`} className="btn-primary w-full py-3 inline-block text-center">
          Retour au cours
        </Link>
</div>
)
}
@@ -143,7 +205,7 @@ export default function ExamPage() {
))}
</div>

      <button onClick={() => setSubmitted(true)} className="btn-primary w-full py-4 mt-6 text-base">
      <button onClick={handleSubmit} className="btn-primary w-full py-4 mt-6 text-base">
Terminer le crash test
</button>
</div>
