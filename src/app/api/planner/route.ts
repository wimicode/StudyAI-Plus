import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStudyPlan } from '@/lib/ai/client';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();
    const weeks_count = typeof body.weeks_count === 'number' && body.weeks_count > 0 ? body.weeks_count : 4;
    const daily_hours = typeof body.daily_hours === 'number' && body.daily_hours > 0 ? body.daily_hours : 4;
    const rest_days = Array.isArray(body.rest_days) ? body.rest_days : ['saturday', 'sunday'];

    const [{ data: exams }, { data: courses }] = await Promise.all([
      supabase.from('exams').select('subject, exam_date').eq('user_id', user.id).order('exam_date'),
      supabase.from('courses').select('title, subject').eq('user_id', user.id),
    ]);

    const plan = await generateStudyPlan(
      exams ?? [],
      courses ?? [],
      weeks_count,
      daily_hours,
      rest_days,
      'fr'
    );

    const { data: saved, error } = await supabase.from('study_plans').insert({
      user_id: user.id,
      plan_data: plan,
      weeks_count,
      daily_hours,
      rest_days,
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: saved });
  } catch (error) {
    console.error('[planner] error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
