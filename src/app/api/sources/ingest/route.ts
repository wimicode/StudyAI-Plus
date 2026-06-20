import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeSources, generateFlashcards, generateQuiz } from '@/lib/ai/client';
import type { SourceType } from '@/types';

// 3 appels LLM en parallèle (analyse + flashcards + quiz) peuvent dépasser
// le défaut Vercel de 10s. On l'étend au maximum autorisé sur Hobby.
export const maxDuration = 60;

type IncomingSource = { type: SourceType; value: string; title: string };

export async function POST(req: NextRequest) {
  let supabase;
  let userId: string | undefined;
  let courseId: string | undefined;

  try {
    const allCookies = req.cookies.getAll().map(c => c.name)
    console.log('[ingest] cookies reçus:', allCookies)
    supabase = await createClient();
    let { data: { user }, error: authError } = await supabase.auth.getUser();

    // Fallback : si le cookie de session est absent/invalide côté serveur,
    // on retente avec le token Bearer envoyé explicitement par le frontend.
    if (!user) {
      const authHeader = req.headers.get('authorization')
      const bearerToken = authHeader?.replace('Bearer ', '')
      if (bearerToken) {
        const result = await supabase.auth.getUser(bearerToken)
        user = result.data.user
        authError = result.error
        console.log('[ingest] fallback Bearer — user:', user?.id ?? 'NULL toujours', '| error:', authError?.message ?? 'none')
      }
    }

    console.log('[ingest] auth check — user:', user?.id ?? 'NULL', '| error:', authError?.message ?? 'none');
    if (!user) return NextResponse.json({ error: 'Non autorisé', debug: authError?.message }, { status: 401 });
    userId = user.id;

    const body = await req.json();
    const {
      sources, courseTitle, subject, level, lang,
    }: { sources: IncomingSource[]; courseTitle: string; subject: string; level: string; lang: string } = body;

    if (!courseTitle?.trim()) {
      return NextResponse.json({ error: 'Titre du cours manquant' }, { status: 400 });
    }
    if (!Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json({ error: 'Aucune source fournie' }, { status: 400 });
    }

    // 1. Créer le cours
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        title: courseTitle.trim(),
        subject: subject?.trim() || 'Général',
        language: lang || 'fr',
        level: level || 'lycee',
        status: 'processing',
      })
      .select()
      .single();

    if (courseError || !course) throw courseError ?? new Error('Création du cours échouée');
    courseId = course.id;

    // 2. Insérer les sources liées à ce cours
    const sourceRows = sources.map((s) => ({
      user_id: user.id,
      course_id: course.id,
      type: s.type,
      title: s.title || s.type,
      raw_url: s.type === 'text' ? null : s.value,
      content_text: s.type === 'text' ? s.value : null,
      status: 'processing' as const,
    }));

    const { data: insertedSources, error: sourcesError } = await supabase
      .from('sources')
      .insert(sourceRows)
      .select();

    if (sourcesError) throw sourcesError;

    // 3. Construire le contenu pour l'IA
    const sourcesForAI = (insertedSources ?? []).map((s) => ({
      type: s.type as string,
      title: s.title ?? undefined,
      content:
        s.type === 'text' && s.content_text
          ? s.content_text
          : s.type === 'youtube' && s.raw_url
          ? `[Vidéo YouTube: ${s.raw_url}]`
          : s.type === 'drive' && s.raw_url
          ? `[Google Drive: ${s.raw_url}]`
          : s.type === 'image' && s.raw_url
          ? `[Image: ${s.raw_url}]`
          : '',
    })).filter((s) => s.content.length > 0);

    const combinedContent = sourcesForAI.map((s) => s.content).join('\n\n---\n\n')
      || `${course.title} - ${course.subject}`;

    // 4. Générer le contenu IA en parallèle
    const [analysis, flashcards, quiz] = await Promise.all([
      analyzeSources(sourcesForAI, course.subject, course.level, course.language),
      generateFlashcards(combinedContent, course.subject, course.level, course.language),
      generateQuiz(combinedContent, course.subject, course.level, course.language),
    ]);

    // 5. Mettre à jour le cours avec les résultats IA
    const { error: updateError } = await supabase.from('courses').update({
      summary: analysis.summary,
      glossary: analysis.glossary,
      key_concepts: analysis.key_concepts,
      flashcards,
      quiz_questions: quiz,
      status: 'ready',
    }).eq('id', course.id).eq('user_id', user.id);

    if (updateError) throw updateError;

    // 6. Marquer les sources comme traitées
    await supabase.from('sources').update({ status: 'processed' }).eq('course_id', course.id).eq('user_id', user.id);

    return NextResponse.json({ success: true, courseId: course.id });
  } catch (error) {
    // Log complet et brut, visible dans Vercel Runtime Logs
    console.error('[ingest] RAW ERROR:', error);
    console.error('[ingest] error keys:', error && typeof error === 'object' ? Object.keys(error) : 'n/a');
    console.error('[ingest] error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error || {})));

    // Marquer le cours en erreur si on a réussi à le créer
    if (supabase && courseId && userId) {
      await supabase.from('courses').update({ status: 'error' }).eq('id', courseId).eq('user_id', userId);
      await supabase.from('sources').update({ status: 'error' }).eq('course_id', courseId).eq('user_id', userId);
    }

    // Construction du message de debug la plus robuste possible :
    // capture TOUTES les propriétés énumérables ET non-énumérables (comme .message et .stack sur Error)
    let debugMessage: string;
    try {
      debugMessage = JSON.stringify(error, Object.getOwnPropertyNames(error || {})) || String(error);
    } catch {
      debugMessage = String(error);
    }
    if (debugMessage === '{}' || debugMessage === 'undefined') {
      debugMessage = String(error);
    }

    return NextResponse.json({ error: 'Erreur serveur lors de la génération IA', debug: debugMessage }, { status: 500 });
  }
}
