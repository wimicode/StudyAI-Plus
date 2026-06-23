import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { analyzeSources, type SummaryLength, type SummaryPrecision } from '@/lib/ai/client';

export const maxDuration = 60;

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

    const { length, precision, focusPoints }: { length: SummaryLength; precision: SummaryPrecision; focusPoints?: string } = await req.json();

    const { data: course, error: courseError } = await supabase
      .from('courses').select('*').eq('id', courseId).eq('user_id', user.id).single();
    if (courseError || !course) return NextResponse.json({ error: 'Cours introuvable' }, { status: 404 });

    const { data: sources } = await supabase
      .from('sources').select('*').eq('course_id', courseId).eq('user_id', user.id);

    const sourcesForAI = (sources ?? []).map((s) => ({
      type: s.type as string,
      title: s.title ?? undefined,
      content: s.content_text || `[${s.type}: ${s.raw_url ?? ''}]`,
    }));

    const analysis = await analyzeSources(
      sourcesForAI, course.subject, course.level, course.language,
      length, precision, focusPoints
    );

    const { error: updateError } = await supabase.from('courses').update({
      summary: analysis.summary,
      glossary: analysis.glossary,
      key_concepts: analysis.key_concepts,
    }).eq('id', courseId).eq('user_id', user.id);
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[regenerate-summary] error:', error);
    let debugMessage: string;
    try {
      debugMessage = JSON.stringify(error, Object.getOwnPropertyNames(error || {})) || String(error);
    } catch {
      debugMessage = String(error);
    }
    return NextResponse.json({ error: 'Erreur lors de la régénération', debug: debugMessage }, { status: 500 });
  }
}
