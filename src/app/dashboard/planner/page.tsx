'use client'
import { useEffect, useState } from 'react'
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

  function toggleRestDay(day: string) {
    setRestDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  async function generatePlan() {
    if (exams.length === 0) { setError('Ajoute au moins un examen.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams, weeksCount, dailyHours, restDays }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { plan } = await res.json()
      setPlan(plan)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
  const dayLabels: Record<string, string> = { monday:'Lun', tuesday:'Mar', wednesday:'Mer', thursday:'Jeu', friday:'Ven', saturday:'Sam', sunday:'Dim' }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-purple-900 text-white px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">📅 Planificateur de révision</h1>
        <p className="text-purple-300 mb-8">Ajoute tes examens et l’IA génère ton planning personalisé.</p>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4 mb-6">
          <h2 className="font-semibold">📌 Tes examens</h2>
          <div className="flex gap-3 flex-wrap">
            <input placeholder="Matière" value={newSubject} onChange={e => setNewSubject(e.target.value)}
              className="flex-1 min-w-32 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-purple-300 focus:outline-none"/>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none"/>
            <button onClick={addExam} className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-xl text-sm font-medium transition-all">+ Ajouter</button>
          </div>
          {exams.map((e, i) => (
            <div key={i} className="flex justify-between bg-white/5 rounded-xl px-4 py-2 text-sm">
              <span>{e.subject}</span><span className="text-purple-300">{e.date}</span>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <label className="text-purple-300 text-sm block mb-2">Semaines</label>
            <input type="number" min={1} max={16} value={weeksCount} onChange={e => setWeeksCount(+e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none"/>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <label className="text-purple-300 text-sm block mb-2">Heures/jour</label>
            <input type="number" min={1} max={12} value={dailyHours} onChange={e => setDailyHours(+e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-white focus:outline-none"/>
          </div>
          <div className="bg-white/10 border border-white/20 rounded-2xl p-4">
            <label className="text-purple-300 text-sm block mb-2">Jours de repos</label>
            <div className="flex gap-1 flex-wrap">
              {days.map(d => (
                <button key={d} onClick={() => toggleRestDay(d)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                    restDays.includes(d) ? 'bg-purple-600 text-white' : 'bg-white/10 text-purple-300'
                  }`}>{dayLabels[d]}</button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <button onClick={generatePlan} disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-lg mb-8">
          {loading ? '⏳ Génération du planning...' : '🧠 Générer mon planning'}
        </button>

        {plan.length > 0 && (
          <div className="space-y-2">
            <h2 className="font-semibold text-lg mb-4">📆 Ton planning</h2>
            {plan.map((entry, i) => (
              <div key={i} className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 flex justify-between items-start">
                <div>
                  <div className="font-medium">{entry.date} — {entry.subject}</div>
                  <div className="text-sm text-purple-300 mt-1">{entry.task}</div>
                  {entry.tips && <div className="text-xs text-purple-400 mt-1">💡 {entry.tips}</div>}
                </div>
                <span className="text-purple-300 text-sm">{entry.duration_hours}h</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
