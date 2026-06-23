'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { StudyPlanEntry } from '@/types'

export default function PlannerPage() {
  const supabase = createClient()
  const [exams, setExams]           = useState<{ subject: string; date: string }[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [newDate, setNewDate]       = useState('')
  const [weeksCount, setWeeksCount] = useState(4)
  const [dailyHours, setDailyHours] = useState(3)
  const [restDays, setRestDays]     = useState(['saturday', 'sunday'])
  const [plan, setPlan]             = useState<StudyPlanEntry[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  function addExam() {
    if (!newSubject || !newDate) return
    setExams(prev => [...prev, { subject: newSubject, date: newDate }])
    setNewSubject('')
    setNewDate('')
  }

  function removeExam(i: number) {
    setExams(prev => prev.filter((_, idx) => idx !== i))
  }

  function toggleRestDay(day: string) {
    setRestDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function generatePlan() {
    if (exams.length === 0) { setError('Ajoute au moins un examen.'); return }
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ exams, weeksCount, dailyHours, restDays }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { plan: saved } = await res.json()
      setPlan(saved.plan_data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
  const dayLabels: Record<string, string> = { monday:'Lun', tuesday:'Mar', wednesday:'Mer', thursday:'Jeu', friday:'Ven', saturday:'Sam', sunday:'Dim' }

  return (
    <div className="animate-fade-in max-w-3xl mx-auto">
      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">📅 Planificateur de révision</h1>
      <p className="text-ink-400 text-sm mb-8">Ajoute tes examens et l&apos;IA génère ton planning personnalisé.</p>

      <div className="card space-y-4 mb-6">
        <h2 className="font-serif text-lg text-ink-800">📌 Tes examens</h2>
        <div className="flex gap-3 flex-wrap">
          <input placeholder="Matière" value={newSubject} onChange={e => setNewSubject(e.target.value)}
            className="input flex-1 min-w-32" />
          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
            className="input w-auto" />
          <button onClick={addExam} className="btn-secondary px-4">+ Ajouter</button>
        </div>
        {exams.map((e, i) => (
          <div key={i}
            className="flex justify-between items-center bg-paper-200/60 rounded-xl px-4 py-2.5 text-sm"
            style={{ transform: `rotate(${i % 2 === 0 ? '-0.3deg' : '0.25deg'})` }}>
            <span className="text-ink-700 font-medium">{e.subject}</span>
            <div className="flex items-center gap-3">
              <span className="text-ink-400">{e.date}</span>
              <button onClick={() => removeExam(i)} className="text-rust-500 hover:text-rust-600 text-xs font-medium transition-colors">
                Retirer
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <label className="text-ink-400 text-xs block mb-2">Semaines</label>
          <input type="number" min={1} max={16} value={weeksCount} onChange={e => setWeeksCount(+e.target.value)}
            className="input" />
        </div>
        <div className="card">
          <label className="text-ink-400 text-xs block mb-2">Heures/jour</label>
          <input type="number" min={1} max={12} value={dailyHours} onChange={e => setDailyHours(+e.target.value)}
            className="input" />
        </div>
        <div className="card">
          <label className="text-ink-400 text-xs block mb-2">Jours de repos</label>
          <div className="flex gap-1 flex-wrap">
            {days.map(d => (
              <button key={d} onClick={() => toggleRestDay(d)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  restDays.includes(d) ? 'bg-ink-700 text-paper-100' : 'bg-paper-200 text-ink-500'
                }`}>{dayLabels[d]}</button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-rust-600 text-sm bg-rust-500/8 border border-rust-500/20 rounded-xl px-4 py-3 mb-4">
          {error}
        </p>
      )}

      <button onClick={generatePlan} disabled={loading} className="btn-primary w-full py-4 text-base mb-8">
        {loading ? '⏳ Génération du planning...' : '🧠 Générer mon planning'}
      </button>

      {plan.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-serif text-lg text-ink-800 mb-4">📆 Ton planning</h2>
          {plan.map((entry, i) => (
            <div key={i} className="card flex justify-between items-start">
              <div>
                <div className="font-medium text-ink-800">{entry.date} — {entry.subject}</div>
                <div className="text-sm text-ink-500 mt-1">{entry.task}</div>
                {entry.tips && <div className="text-xs text-ink-400 mt-1">💡 {entry.tips}</div>}
              </div>
              <span className="badge bg-primary-100 text-primary-700 shrink-0">{entry.duration_hours}h</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
