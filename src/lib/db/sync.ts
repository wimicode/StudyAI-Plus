import { getUnsyncedScores, markScoreSynced } from './indexeddb'

export async function syncPendingScores(): Promise<{ synced: number; failed: number }> {
  const unsynced = await getUnsyncedScores()
  let synced = 0
  let failed = 0

  for (const score of unsynced) {
    try {
      const res = await fetch('/api/scores/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(score),
      })
      if (res.ok) {
        await markScoreSynced(score.id)
        synced++
      } else {
        failed++
      }
    } catch {
      failed++
    }
  }

  return { synced, failed }
}
