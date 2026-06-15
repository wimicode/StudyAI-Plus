'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/types'

export default function CoursePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'summary' | 'glossary' | 'concepts'>('summary')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('courses').select('*').eq('id', id).single()
      setCourse(data)
      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-white">⏳ Chargement...</div>
  if (!course)  return <div className="min-h-screen bg-indigo-950 flex items-center justify-center text-white">Cours introuvable</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 to-purple-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-purple-300 hover:text-white">← Retour</Link>
          <h1 className="text-3xl font-bold">{course.title}</h1>
          <span className="bg-purple-500/30 text-purple-200 text-sm px-3 py-1 rounded-full">{course.subject}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: `flashcards`, icon: '🃏', label: 'Flashcards', count: course.flashcards?.length },
            { href: `quiz`,       icon: '❓',        label: 'Quiz',       count: course.quiz_questions?.length },
            { href: `exam`,       icon: '📝',       label: 'Crash Test', count: null },
            { href: `/dashboard/planner`, icon: '📅', label: 'Planner', count: null },
          ].map(({ href, icon, label, count }) => (
            <Link key={label}
              href={href.startsWith('/') ? href : `/dashboard/courses/${id}/${href}`}
              className="bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 rounded-2xl p-5 text-center transition-all group">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="font-semibold group-hover:text-purple-300 transition-colors">{label}</div>
              {count != null && <div className="text-purple-400 text-xs mt-1">{count} éléments</div>}
            </Link>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl overflow-hidden">
          <div className="flex border-b border-white/10">
            {(['summary', 'glossary', 'concepts'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium transition-all ${
                  activeTab === tab ? 'bg-purple-600 text-white' : 'text-purple-300 hover:text-white'
                }`}>
                {tab === 'summary' ? '📄 Résumé' : tab === 'glossary' ? '📖 Glossaire' : '💡 Concepts'}
              </button>
            ))}
          </div>
          <div className="p-6">
            {activeTab === 'summary' && (
              <div className="prose prose-invert max-w-none">
                <p className="text-purple-100 leading-relaxed whitespace-pre-wrap">{course.summary || 'Résumé non disponible'}</p>
              </div>
            )}
            {activeTab === 'glossary' && (
              <div className="space-y-3">
                {course.glossary?.map((g, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4">
                    <span className="font-semibold text-purple-300">{g.term}</span>
                    <span className="text-purple-200"> — {g.definition}</span>
                  </div>
                )) || <p className="text-purple-400">Glossaire non disponible</p>}
              </div>
            )}
            {activeTab === 'concepts' && (
              <div className="space-y-3">
                {course.key_concepts?.map((c, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4">
                    <div className="font-semibold text-purple-300 mb-1">{c.concept}</div>
                    <div className="text-purple-200 text-sm">{c.explanation}</div>
                  </div>
                )) || <p className="text-purple-400">Concepts non disponibles</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
