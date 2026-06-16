import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSources, generateFlashcards, generateQuiz } from '@/lib/ai/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const course_id = body.course_id as string | undefined;
    if (!course_id || typeof course_id !== 'string') {
      return NextResponse.json({ error: 'course_id manquant ou invalide' }, { status: 400 });
    }

    // Vérifier que le cours appartient bien à l'utilisateur
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .eq('user_id', user.id)
      .single();
    if (!course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });

    // Récupérer les sources de CE cours pour CET utilisateur
    const { data: sources } = await supabase
      .from('sources')
      .select('*')
      .eq('course_id', course_id)
      .eq('user_id', user.id);
    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: 'Aucune source pour ce cours' }, { status: 400 });
    }

    // Marquer les sources comme en cours de traitement
    await supabase.from('sources').update({ status: 'processing' }).eq('course_id', course_id).eq('user_id', user.id);

    // Construire la liste des sources pour le client IA
    const sourcesForAI = sources.map((s) => ({
      type: s.type as string,
      title: s.title ?? undefined,
      content:
        s.type === 'text' && s.content_text
          ? s.content_text
          : s.type === 'youtube' && s.content_text
          ? `[Transcription YouTube: ${s.raw_url}]\n${s.content_text}`
          : s.type === 'youtube' && s.raw_url
          ? `[Vidéo YouTube: ${s.raw_url}]`
          : s.type === 'drive' && s.raw_url
          ? `[Google Drive: ${s.raw_url}]`
          : s.type === 'pdf' && s.raw_url
          ? `[PDF: ${s.raw_url}]`
          : '',
    })).filter((s) => s.content.length > 0);

    const combinedContent = sourcesForAI.map((s) => s.content).join('\n\n---\n\n')
      || `${course.title} - ${course.subject}`;

    // Générer le contenu IA en parallèle
    const [analysis, flashcards, quiz] = await Promise.all([
      analyzeSources(sourcesForAI, course.subject, course.level, course.language),
      generateFlashcards(combinedContent, course.subject, course.level, course.language),
      generateQuiz(combinedContent, course.subject, course.level, course.language),
    ]);

    // Mettre à jour le cours avec les résultats IA
    const { error: updateError } = await supabase.from('courses').update({
      summary: analysis.summary,
      glossary: analysis.glossary,
      key_concepts: analysis.key_concepts,
      flashcards,
      quiz_questions: quiz,
      status: 'ready',
    }).eq('id', course_id).eq('user_id', user.id);

    if (updateError) throw updateError;

    // Marquer les sources comme traitées
    await supabase.from('sources').update({ status: 'processed' }).eq('course_id', course_id).eq('user_id', user.id);

    return NextResponse.json({ success: true, course_id });
  } catch (error) {
    console.error('[ingest] error:', error);
    // Marquer les sources en erreur
    const body = await (req as NextRequest & { _body?: { course_id?: string } });
    return NextResponse.json({ error: 'Erreur serveur lors de la génération IA' }, { status: 500 });
  }
}
