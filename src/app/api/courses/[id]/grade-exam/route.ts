import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { gradeOpenAnswer } from '@/lib/ai/client';
import type { ExamContent } from '@/types';

// Plusieurs corrections IA séquentielles (une par question ouverte) —
// peut prendre du temps sur un examen avec beaucoup de questions ouvertes.
export const maxDuration = 60;

type SubmittedAnswers = Record<string, string>; // questionId -> réponse de l'élève

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: courseId } = await params;

  try {
    let supabase = await createServerClient();
    let { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const authHeader = req.headers.get('authorization');
      const bearerToken = authHeader?.replace('Bearer ', '');
      if (bearerToken) {
        supabase = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
        );
        const result = await supabase.auth.getUser(bearerToken);
        user = result.data.user;
      }
    }
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { answers }: { answers: SubmittedAnswers } = await req.json();

    const { data: course, error: courseError } = await supabase
      .from('courses').select('*').eq('id', courseId).eq('user_id', user.id).single();
    if (courseError || !course || !course.exam_content) {
      return NextResponse.json({ error: 'Crash test introuvable' }, { status: 404 });
    }

    const exam = course.exam_content as ExamContent;
    const { data: sources } = await supabase
      .from('sources').select('content_text').eq('course_id', courseId).eq('user_id', user.id);
    const courseContent = (sources ?? []).map((s) => s.content_text || '').join('\n\n').slice(0, 6000)
      || `${course.title} - ${course.subject}`;

    const results: Array<{ questionId: string; score: number; maxPoints: number; feedback: string }> = [];

    for (const section of exam.sections) {
      for (const q of section.questions) {
        const studentAnswer = answers[q.id] ?? '';

        if (q.type === 'open') {
          // Correction sémantique par IA, en séquentiel pour respecter le rate-limit Groq
          const grade = await gradeOpenAnswer(q.question, studentAnswer, q.points, courseContent, course.language);
          results.push({ questionId: q.id, score: grade.score, maxPoints: q.points, feedback: grade.feedback });
        } else {
          // Auto-correction directe pour mcq/true_false
          const isCorrect = studentAnswer === q.correctAnswer;
          results.push({
            questionId: q.id,
            score: isCorrect ? q.points : 0,
            maxPoints: q.points,
            feedback: isCorrect ? 'Correct !' : `Réponse attendue : ${q.correctAnswer}`,
          });
        }
      }
    }

    const totalScore = results.reduce((sum, r) => sum + r.score, 0);
    const totalMax = results.reduce((sum, r) => sum + r.maxPoints, 0);

    return NextResponse.json({ results, totalScore, totalMax });
  } catch (error) {
    console.error('[grade-exam] error:', error);
    let debugMessage: string;
    try {
      debugMessage = JSON.stringify(error, Object.getOwnPropertyNames(error || {})) || String(error);
    } catch {
      debugMessage = String(error);
    }
    return NextResponse.json({ error: 'Erreur lors de la correction', debug: debugMessage }, { status: 500 });
  }
}
