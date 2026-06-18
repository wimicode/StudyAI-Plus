'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Course } from '@/types'

export default function DashboardPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState('')

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
          <Link key={course.id} href={`/dashboard/courses/${course.id}`}
            className="card hover:shadow-[0_2px_8px_rgba(43,38,32,0.1),0_8px_24px_rgba(43,38,32,0.08)] transition-all group">
            <div className="text-3xl mb-3">📖</div>
            <h3 className="font-serif text-lg text-ink-800 mb-1 group-hover:text-primary-600 transition-colors">
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
