'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { Course, QuizScore } from '@/types';
import { BookOpen, Zap, Target, PlusCircle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('*').order('updated_at', { ascending: false }).limit(5),
      supabase.from('quiz_scores').select('*').order('created_at', { ascending: false }).limit(10),
    ]).then(([coursesRes, scoresRes]) => {
      setCourses(coursesRes.data ?? []);
      setScores(scoresRes.data ?? []);
      setLoading(false);
    });
  }, []);

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((acc, s) => acc + (s.score / s.total) * 100, 0) / scores.length)
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Bonjour{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} 👋</h2>
        <p className="text-slate-400 mt-1">Prêt·e à réviser ? Voici ton tableau de bord.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[{ label: 'Cours', value: courses.length, icon: BookOpen, color: 'text-indigo-400' },
          { label: 'Sessions', value: scores.length, icon: Zap, color: 'text-yellow-400' },
          { label: 'Score moyen', value: avgScore !== null ? `${avgScore}%` : '—', icon: TrendingUp, color: 'text-green-400' },
          { label: 'Flashcards', value: courses.reduce((a, c) => a + (c.flashcards?.length ?? 0), 0), icon: Target, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-3">
            <Icon className={color} size={24} />
            <div><p className="text-xl font-bold text-white">{loading ? '…' : value}</p><p className="text-xs text-slate-400">{label}</p></div>
          </div>
        ))}
      </div>

      {/* Derniers cours */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Derniers cours</h3>
          <Link href="/dashboard/sources" className="btn-primary">
            <PlusCircle size={16} /> Nouveau cours
          </Link>
        </div>
        {loading ? <p className="text-slate-400">Chargement...</p> : courses.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400 mb-4">Aucun cours pour l’instant.</p>
            <Link href="/dashboard/sources" className="btn-primary">Ajouter une source</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {courses.map((course) => (
              <Link key={course.id} href={`/dashboard/courses/${course.id}`} className="card hover:border-primary-600 transition-colors group">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold text-white group-hover:text-primary-400 transition-colors">{course.title}</h4>
                    <p className="text-sm text-slate-400 mt-1">{course.subject}</p>
                  </div>
                  <span className="badge bg-slate-800 text-slate-300">{course.level}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  {course.flashcards && <span className="badge bg-indigo-900 text-indigo-300">{course.flashcards.length} flashcards</span>}
                  {course.quiz_questions && <span className="badge bg-purple-900 text-purple-300">{course.quiz_questions.length} questions</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
