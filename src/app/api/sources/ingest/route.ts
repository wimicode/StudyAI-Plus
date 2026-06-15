import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateCourseAnalysis, generateFlashcards, generateQuiz } from '@/lib/groq/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { course_id } = await req.json() as { course_id: string };
    if (!course_id) return NextResponse.json({ error: 'course_id manquant' }, { status: 400 });

    // Get course details
    const { data: course } = await supabase.from('courses').select('*').eq('id', course_id).eq('user_id', user.id).single();
    if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });

    // Get all sources for this course
    const { data: sources } = await supabase.from('sources').select('*').eq('course_id', course_id).eq('user_id', user.id);
    if (!sources || sources.length === 0) return NextResponse.json({ error: 'Aucune source' }, { status: 400 });

    // Mark all sources as processing
    await supabase.from('sources').update({ status: 'processing' }).eq('course_id', course_id);

    // Collect all text content from sources
    const contentParts: string[] = [];
    for (const source of sources) {
      if (source.type === 'text' && source.text_content) {
        contentParts.push(`[Source texte]\n${source.text_content}`);
      }
      if (source.type === 'youtube' && source.transcript) {
        contentParts.push(`[Transcription YouTube: ${source.raw_url}]\n${source.transcript}`);
      } else if (source.type === 'youtube' && source.raw_url) {
        contentParts.push(`[Vidéo YouTube disponible: ${source.raw_url}]`);
      }
      if (source.type === 'drive') {
        contentParts.push(`[Document Google Drive: ${source.raw_url}]`);
      }
      if (source.type === 'pdf' && source.pdf_url) {
        contentParts.push(`[PDF disponible: ${source.pdf_url}]`);
      }
    }

    const combinedContent = contentParts.join('\n\n---\n\n') || `${course.title} - ${course.subject}`;

    // Generate AI content in parallel
    const [analysis, flashcards, quiz] = await Promise.all([
      generateCourseAnalysis(combinedContent, course.title, course.subject, course.level, course.language),
      generateFlashcards(combinedContent, course.subject, course.level, course.language),
      generateQuiz(combinedContent, course.subject, course.level, course.language),
    ]);

    // Update the course with AI results
    const { error: updateError } = await supabase.from('courses').update({
      summary: analysis.summary,
      glossary: analysis.glossary,
      key_concepts: analysis.key_concepts,
      flashcards,
      quiz_questions: quiz,
    }).eq('id', course_id);

    if (updateError) throw updateError;

    // Mark sources as processed
    await supabase.from('sources').update({ status: 'processed' }).eq('course_id', course_id);

    return NextResponse.json({ success: true, course_id });
  } catch (error) {
    console.error('[ingest] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
