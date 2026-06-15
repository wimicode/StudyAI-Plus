import { openDB, DBSchema, IDBPDatabase } from 'idb'
import type { Course, QuizScore } from '@/types'

interface StudyAIDB extends DBSchema {
  courses: { key: string; value: Course & { _savedAt: number } }
  quiz_scores: { key: string; value: QuizScore & { _pendingSync: boolean } }
}

let db: IDBPDatabase<StudyAIDB> | null = null

export async function getDB(): Promise<IDBPDatabase<StudyAIDB>> {
  if (db) return db
  db = await openDB<StudyAIDB>('studyai-plus', 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('courses')) {
        database.createObjectStore('courses', { keyPath: 'id' })
      }
      if (!database.objectStoreNames.contains('quiz_scores')) {
        database.createObjectStore('quiz_scores', { keyPath: 'id' })
      }
    },
  })
  return db
}

export async function saveOfflineCourse(course: Course): Promise<void> {
  const database = await getDB()
  await database.put('courses', { ...course, _savedAt: Date.now() })
}

export async function getOfflineCourses(): Promise<Course[]> {
  const database = await getDB()
  return database.getAll('courses')
}

export async function deleteOfflineCourse(id: string): Promise<void> {
  const database = await getDB()
  await database.delete('courses', id)
}

export async function savePendingScore(score: QuizScore): Promise<void> {
  const database = await getDB()
  await database.put('quiz_scores', { ...score, _pendingSync: true })
}

export async function getPendingScores(): Promise<(QuizScore & { _pendingSync: boolean })[]> {
  const database = await getDB()
  const all = await database.getAll('quiz_scores')
  return all.filter((s) => s._pendingSync)
}

export async function markScoreSynced(id: string): Promise<void> {
  const database = await getDB()
  const score = await database.get('quiz_scores', id)
  if (score) await database.put('quiz_scores', { ...score, _pendingSync: false })
}
