import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Course, QuizScore } from '@/types'

interface StudyAIDB extends DBSchema {
  courses: {
    key: string
    value: Course
    indexes: { by_subject: string }
  }
  quiz_scores: {
    key: string
    value: QuizScore
    indexes: { by_course: string; unsynced: number }
  }
}

let dbPromise: Promise<IDBPDatabase<StudyAIDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<StudyAIDB>('studyai-plus', 1, {
      upgrade(db) {
        const coursesStore = db.createObjectStore('courses', { keyPath: 'id' })
        coursesStore.createIndex('by_subject', 'subject')

        const scoresStore = db.createObjectStore('quiz_scores', { keyPath: 'id' })
        scoresStore.createIndex('by_course', 'course_id')
        scoresStore.createIndex('unsynced', 'synced')
      },
    })
  }
  return dbPromise
}

export async function saveOfflineCourse(course: Course) {
  const db = await getDB()
  await db.put('courses', course)
}

export async function getOfflineCourse(id: string): Promise<Course | undefined> {
  const db = await getDB()
  return db.get('courses', id)
}

export async function getAllOfflineCourses(): Promise<Course[]> {
  const db = await getDB()
  return db.getAll('courses')
}

export async function deleteOfflineCourse(id: string) {
  const db = await getDB()
  await db.delete('courses', id)
}

export async function saveOfflineScore(score: QuizScore) {
  const db = await getDB()
  await db.put('quiz_scores', { ...score, synced: false })
}

export async function getUnsyncedScores(): Promise<QuizScore[]> {
  const db = await getDB()
  return db.getAllFromIndex('quiz_scores', 'unsynced', 0)
}

export async function markScoreSynced(id: string) {
  const db = await getDB()
  const score = await db.get('quiz_scores', id)
  if (score) await db.put('quiz_scores', { ...score, synced: true })
}
