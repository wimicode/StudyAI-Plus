'use client'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { MoreVertical, Trash2 } from 'lucide-react'
import type { Course } from '@/types'

export default function DashboardPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/auth/login'; return }
      setUserName(user.user_metadata?.full_name || user.email || '')
      const { data } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false })
      setCourses(data || [])
      setLoading(false)
    }
    load()
  }, [supabase])

  // Fermer le menu si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleDelete(courseId: string) {
    setDeletingId(courseId)
    setOpenMenuId(null)
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId)
      if (error) throw error
      setCourses(prev => prev.filter(c => c.id !== courseId))
    } catch {
      alert('Erreur lors de la suppression du cours.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-serif text-3xl font-semibold text-ink-800 mb-1">
        Bonjour {userName ? userName.split(' ')[0] : ''} 👋
      </h1>
      <p className="text-ink-400 mb-8 text-sm">
        {loading ? 'Chargement...' : `${courses.length} cours dans ta bibliothèque`}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {courses.map(course => (
          <div key={course.id}
            className={`card relative hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all group ${
              deletingId === course.id ? 'opacity-40 pointer-events-none' : ''
            }`}>

            {/* Menu trois petits points */}
            <div className="absolute top-3 right-3 z-10" ref={openMenuId === course.id ? menuRef : null}>
              <button
                onClick={(e) => { e.preventDefault(); setOpenMenuId(openMenuId === course.id ? null : course.id) }}
                className="p-1.5 rounded-full text-ink-400 hover:text-ink-700 hover:bg-paper-200 transition-colors"
                aria-label="Options du cours">
                <MoreVertical size={18} />
              </button>

              {openMenuId === course.id && (
                <div className="absolute right-0 mt-1 w-44 bg-paper-50 border border-ink-700/10 rounded-lg shadow-[0_4px_16px_rgba(43,38,32,0.12)] overflow-hidden">
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(course.id) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-rust-600 hover:bg-rust-500/8 transition-colors">
                    <Trash2 size={15} /> Supprimer le cours
                  </button>
                </div>
              )}
            </div>

            <Link href={`/dashboard/courses/${course.id}`} className="block">
              <div className="text-3xl mb-3">📖</div>
              <h3 className="font-serif text-lg text-ink-800 mb-1 group-hover:text-primary-600 transition-colors pr-8">
                {course.title}
              </h3>
              <p className="text-ink-400 text-sm mb-3">{course.subject}</p>
              <div className="flex gap-2 flex-wrap">
                {course.flashcards && (
                  <span className="badge bg-primary-100 text-primary-700">
                    {(course.flashcards as unknown[]).length} flashcards
                  </span>
                )}
                {course.quiz_questions && (
                  <span className="badge bg-brand-100 text-brand-700">
                    {(course.quiz_questions as unknown[]).length} questions
                  </span>
                )}
              </div>
            </Link>
          </div>
        ))}

        {!loading && courses.length === 0 && (
          <div className="col-span-full text-center py-20">
            <div className="text-5xl mb-4">📥</div>
            <p className="text-ink-400 mb-6">
              Aucun cours pour l&apos;instant.<br />
              Importe ta première source pour commencer !
            </p>
            <Link href="/dashboard/sources" className="btn-primary px-6 py-3">
              Ajouter une source
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
