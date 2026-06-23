import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { generateFlashcards, generateQuiz, generateExam } from '@/lib/ai/client';

// Génération IA peut prendre du temps — on s'aligne sur le plafond Hobby.
export const maxDuration = 60;

type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

type GenerateRequest = {
  flashcards?: { count: number; difficulty: Difficulty; instructions?: string };
  quiz?: { count: number; difficulty: Difficulty; numChoices: number; instructions?: string };
  exam?: { questionCount: number; difficulty: Difficulty; durationMinutes: number; instructions?: string };
};

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Facile', medium: 'Moyen', hard: 'Difficile', mixed: 'Mixte',
};

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

    const body: GenerateRequest = await req.json();

    const { data: course, error: courseError } = await supabase
      .from('courses').select('*').eq('id', courseId).eq('user_id', user.id).single();
    if (courseError || !course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });

    const { data: sources } = await supabase
      .from('sources').select('*').eq('course_id', courseId).eq('user_id', user.id);

    const combinedContent = (sources ?? [])
      .map((s) => s.content_text || `[${s.type}: ${s.raw_url ?? ''}]`)
      .join('\n\n---\n\n') || `${course.title} - ${course.subject}`;

    const inserted: Array<{ type: string; id: string; title: string }> = [];

    // Génération séquentielle (pas en parallèle) pour rester sous la limite
    // de débit Groq, même si plusieurs types sont demandés en même temps.
    if (body.flashcards) {
      const { count, difficulty, instructions } = body.flashcards;
      const content = await generateFlashcards(
        combinedContent, course.subject, course.level, course.language,
        count, difficulty, instructions
      );
      const title = `${count} cartes • ${DIFFICULTY_LABEL[difficulty]}${instructions ? ` • ${instructions.slice(0, 40)}` : ''}`;
      const { data, error } = await supabase.from('generations').insert({
        user_id: user.id, course_id: courseId, type: 'flashcards', title, content,
        settings: body.flashcards,
      }).select().single();
      if (error) throw error;
      inserted.push({ type: 'flashcards', id: data.id, title });
    }

    if (body.quiz) {
      const { count, difficulty, numChoices, instructions } = body.quiz;
      const content = await generateQuiz(
        combinedContent, course.subject, course.level, course.language,
        count, difficulty, numChoices, instructions
      );
      const title = `${count} questions • ${DIFFICULTY_LABEL[difficulty]}${instructions ? ` • ${instructions.slice(0, 40)}` : ''}`;
      const { data, error } = await supabase.from('generations').insert({
        user_id: user.id, course_id: courseId, type: 'quiz', title, content,
        settings: body.quiz,
      }).select().single();
      if (error) throw error;
      inserted.push({ type: 'quiz', id: data.id, title });
    }

    if (body.exam) {
      const { questionCount, difficulty, durationMinutes, instructions } = body.exam;
      const content = await generateExam(
        combinedContent, course.subject, course.level, course.language,
        durationMinutes, questionCount, difficulty, instructions
      );
      const title = `${questionCount} questions • ${durationMinutes} min • ${DIFFICULTY_LABEL[difficulty]}`;
      const { data, error } = await supabase.from('generations').insert({
        user_id: user.id, course_id: courseId, type: 'exam', title, content,
        settings: body.exam,
      }).select().single();
      if (error) throw error;
      inserted.push({ type: 'exam', id: data.id, title });
    }

    if (inserted.length === 0) {
      return NextResponse.json({ error: 'Aucune génération demandée' }, { status: 400 });
    }

    return NextResponse.json({ success: true, generated: inserted });
  } catch (error) {
    console.error('[generate] error:', error);
    let debugMessage: string;
    try {
      debugMessage = JSON.stringify(error, Object.getOwnPropertyNames(error || {})) || String(error);
    } catch {
      debugMessage = String(error);
    }
    return NextResponse.json({ error: 'Erreur lors de la génération', debug: debugMessage }, { status: 500 });
  }
}
