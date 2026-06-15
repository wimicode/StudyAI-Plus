import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateExam, gradeExam } from '@/lib/groq/client';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { action, answers, duration } = await req.json() as { action: 'generate' | 'grade'; answers?: Record<string, string>; duration?: number };

  const { data: course } = await supabase.from('courses').select('*').eq('id', params.id).eq('user_id', user.id).single();
  if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });

  if (action === 'generate') {
    const content = course.summary ?? `${course.title} - ${course.subject}`;
    const questions = await generateExam(content, course.subject, duration ?? 60, course.level, course.language);
    return NextResponse.json({ questions });
  }

  if (action === 'grade' && answers && course.quiz_questions) {
    const result = await gradeExam(course.quiz_questions, answers, course.language);
    // Save score
    await supabase.from('quiz_scores').insert({
      user_id: user.id,
      course_id: course.id,
      mode: 'exam',
      score: result.score,
      total: result.total,
      feedback: result.feedback,
      synced: true,
    });
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
}
