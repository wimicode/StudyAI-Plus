import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateExam, gradeExam } from '@/lib/ai/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const action = body.action as 'generate' | 'grade';
    if (!action || !['generate', 'grade'].includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();
    if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });

    if (action === 'generate') {
      const duration = typeof body.duration === 'number' ? body.duration : 60;
      const content = course.summary ?? `${course.title} - ${course.subject}`;
      const exam = await generateExam(content, course.subject, course.level, course.language, duration);
      return NextResponse.json({ exam });
    }

    if (action === 'grade') {
      const answers = body.answers as Record<string, string> | undefined;
      if (!answers || typeof answers !== 'object') {
        return NextResponse.json({ error: 'Réponses manquantes' }, { status: 400 });
      }
      if (!course.quiz_questions) {
        return NextResponse.json({ error: 'Aucun examen généré pour ce cours' }, { status: 400 });
      }
      const result = await gradeExam(course.quiz_questions, answers, course.subject, course.language);
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
  } catch (error) {
    console.error('[exam] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
