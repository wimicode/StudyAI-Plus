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
  const [counts, setCounts] = useState({ flashcards: 0, quiz: 0, exam: 0 })
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'summary' | 'glossary' | 'concepts'>('summary')

  useEffect(() => {
    async function load() {
      const [{ data: courseData }, { data: gens }] = await Promise.all([
        supabase.from('courses').select('*').eq('id', id).single(),
        supabase.from('generations').select('type').eq('course_id', id),
      ])
      setCourse(courseData)
      setCounts({
        flashcards: (gens ?? []).filter(g => g.type === 'flashcards').length,
        quiz: (gens ?? []).filter(g => g.type === 'quiz').length,
        exam: (gens ?? []).filter(g => g.type === 'exam').length,
      })
      setLoading(false)
    }
    load()
  }, [id, supabase])

  if (loading) return <div className="flex items-center justify-center py-32 text-ink-400">⏳ Chargement...</div>
  if (!course)  return <div className="flex items-center justify-center py-32 text-ink-400">Cours introuvable</div>

  const cards = [
    { href: `flashcards`, icon: '🃏', label: 'Flashcards', count: counts.flashcards },
    { href: `quiz`,       icon: '❓', label: 'Quiz',       count: counts.quiz },
    { href: `exam`,       icon: '📝', label: 'Crash Test', count: counts.exam },
    { href: `/dashboard/planner`, icon: '📅', label: 'Planner', count: null },
  ]

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-4 mb-8 flex-wrap">
        <Link href="/dashboard" className="text-ink-400 hover:text-ink-700 transition-colors">← Retour</Link>
        <h1 className="font-serif text-3xl font-semibold text-ink-800">{course.title}</h1>
        <span className="badge bg-primary-100 text-primary-700">{course.subject}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map(({ href, icon, label, count }) => {
          const hasContent = count != null && count > 0
          return (
            <Link key={label}
              href={href.startsWith('/') ? href : `/dashboard/courses/${id}/${href}`}
              className="card text-center hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all group">
              <div className="text-3xl mb-2">{icon}</div>
              <div className="font-medium text-ink-700 group-hover:text-primary-600 transition-colors">{label}</div>
              {hasContent
                ? <div className="text-primary-500 text-xs mt-1">{count} jeu{count > 1 ? 'x' : ''} généré{count > 1 ? 's' : ''}</div>
                : <div className="text-ink-400 text-xs mt-1">Pas encore généré</div>}
            </Link>
          )
        })}
      </div>

      {(!counts.flashcards && !counts.quiz && !counts.exam) && (
        <Link href={`/dashboard/courses/${id}/generate`}
          className="block mb-8 text-center btn-secondary py-3">
          ✨ Générer des flashcards, un quiz ou un crash test
        </Link>
      )}

      <div className="card !p-0 overflow-hidden">
        <div className="flex border-b border-ink-700/10">
          {(['summary', 'glossary', 'concepts'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'text-ink-800 border-b-2 border-primary-500'
                  : 'text-ink-400 hover:text-ink-600'
              }`}>
              {tab === 'summary' ? '📄 Résumé' : tab === 'glossary' ? '📖 Glossaire' : '💡 Concepts'}
            </button>
          ))}
          <Link href={`/dashboard/courses/${id}/generate/summary`}
            className="ml-auto px-4 py-3 text-xs text-ink-400 hover:text-primary-600 transition-colors self-center">
            ⚙️ Réglages
          </Link>
        </div>
        <div className="p-6">
          {activeTab === 'summary' && (
            course.summary
              ? <div className="prose max-w-none text-ink-600 leading-relaxed [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-ink-800 [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:font-serif [&_h3]:text-lg [&_h3]:text-ink-800 [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1"
                  dangerouslySetInnerHTML={{ __html: course.summary }} />
              : <p className="text-ink-400">Résumé non disponible</p>
          )}
          {activeTab === 'glossary' && (
            <div className="space-y-3">
              {course.glossary?.length ? course.glossary.map((g, i) => (
                <div key={i} className="bg-paper-200/60 rounded-xl p-4">
                  <span className="font-semibold text-ink-800">{g.term}</span>
                  <span className="text-ink-500"> — {g.definition}</span>
                </div>
              )) : <p className="text-ink-400">Glossaire non disponible</p>}
            </div>
          )}
          {activeTab === 'concepts' && (
            <div className="space-y-3">
              {course.key_concepts?.length ? course.key_concepts.map((c, i) => (
                <div key={i} className="bg-paper-200/60 rounded-xl p-4">
                  <div className="font-semibold text-ink-800 mb-1">{c.concept}</div>
                  <div className="text-ink-500 text-sm">{c.explanation}</div>
                </div>
              )) : <p className="text-ink-400">Concepts non disponibles</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
