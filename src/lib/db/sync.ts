import { createClient } from '@/lib/supabase/client';
import { getPendingScores, clearPendingScores } from './indexeddb';

export async function syncPendingScores(): Promise<void> {
  const pending = await getPendingScores();
  if (pending.length === 0) return;

  const supabase = createClient();
  const { error } = await supabase.from('quiz_scores').insert(
    pending.map(({ id: _id, ...rest }) => rest)
  );

  if (!error) {
    await clearPendingScores();
    console.log(`[sync] ${pending.length} score(s) synchronisé(s)`);
  } else {
    console.error('[sync] Erreur sync:', error);
  }
}
