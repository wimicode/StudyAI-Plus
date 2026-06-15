import { getPendingScores, markScoreSynced } from './indexeddb'
import { createClient } from '@/lib/supabase/client'

export async function syncPendingScores(): Promise<number> {
  const supabase = createClient()
  const pending = await getPendingScores()
  let synced = 0

  for (const score of pending) {
    const { _pendingSync, ...data } = score
    const { error } = await supabase.from('quiz_scores').upsert(data)
    if (!error) {
      await markScoreSynced(score.id)
      synced++
    }
  }

  return synced
}
