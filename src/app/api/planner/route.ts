import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { generateStudyPlan } from '@/lib/groq/client';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { weeks_count, daily_hours, rest_days } = await req.json() as {
    weeks_count: number;
    daily_hours: number;
    rest_days: string[];
  };

  const [{ data: exams }, { data: courses }] = await Promise.all([
    supabase.from('exams').select('subject, exam_date').eq('user_id', user.id).order('exam_date'),
    supabase.from('courses').select('title, subject').eq('user_id', user.id),
  ]);

  const plan = await generateStudyPlan(
    exams ?? [],
    courses ?? [],
    weeks_count ?? 4,
    daily_hours ?? 4,
    rest_days ?? ['saturday', 'sunday'],
    'fr'
  );

  const { data: saved, error } = await supabase.from('study_plans').insert({
    user_id: user.id,
    plan_data: plan,
    weeks_count: weeks_count ?? 4,
    daily_hours: daily_hours ?? 4,
    rest_days: rest_days ?? ['saturday', 'sunday'],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ plan: saved });
}
