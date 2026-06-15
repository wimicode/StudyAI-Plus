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

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-indigo-900 text-white">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <span className="font-bold text-lg">StudyAI-Plus</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-purple-300 text-sm">{userName}</span>
          <Link href="/dashboard/sources" className="text-sm bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded-lg transition-all">+ Nouveau cours</Link>
          <button onClick={handleLogout} className="text-sm text-purple-300 hover:text-white transition-all">Déconnexion</button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-2">Bonjour 👋</h1>
        <p className="text-purple-300 mb-8">{loading ? 'Chargement...' : `${courses.length} cours dans ta bibliothèque`}</p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map(course => (
            <Link key={course.id} href={`/dashboard/courses/${course.id}`}
              className="bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 rounded-2xl p-6 transition-all group">
              <div className="text-3xl mb-3">📖</div>
              <h3 className="font-bold text-lg mb-1 group-hover:text-purple-300 transition-colors">{course.title}</h3>
              <p className="text-purple-300 text-sm mb-3">{course.subject}</p>
              <div className="flex gap-2 flex-wrap">
                {course.flashcards && <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-1 rounded-full">{(course.flashcards as unknown[]).length} flashcards</span>}
                {course.quiz_questions && <span className="bg-green-500/20 text-green-300 text-xs px-2 py-1 rounded-full">{(course.quiz_questions as unknown[]).length} questions</span>}
              </div>
            </Link>
          ))}

          {!loading && courses.length === 0 && (
            <div className="col-span-full text-center py-20">
              <div className="text-5xl mb-4">📥</div>
              <p className="text-purple-300 mb-6">Aucun cours pour l’instant.<br/>Importe ta première source pour commencer !</p>
              <Link href="/dashboard/sources"
                className="bg-purple-600 hover:bg-purple-500 px-6 py-3 rounded-xl font-semibold transition-all">
                Ajouter une source
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
