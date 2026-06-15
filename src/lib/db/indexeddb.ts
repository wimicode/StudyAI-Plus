import { openDB, type IDBPDatabase } from 'idb';
import type { Course, QuizScore } from '@/types';

const DB_NAME = 'studyai-plus';
const DB_VERSION = 1;

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pdf_blobs')) {
        db.createObjectStore('pdf_blobs', { keyPath: 'course_id' });
      }
      if (!db.objectStoreNames.contains('pending_scores')) {
        db.createObjectStore('pending_scores', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function saveCourseOffline(course: Course, pdfBlob?: Blob): Promise<void> {
  const db = await getDB();
  await db.put('courses', { ...course, cached_at: new Date().toISOString() });
  if (pdfBlob) {
    await db.put('pdf_blobs', { course_id: course.id, blob: pdfBlob });
  }
}

export async function getCachedCourses(): Promise<Course[]> {
  const db = await getDB();
  return db.getAll('courses');
}

export async function getCachedCourse(id: string): Promise<Course | undefined> {
  const db = await getDB();
  return db.get('courses', id);
}

export async function deleteCachedCourse(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('courses', id);
  await db.delete('pdf_blobs', id);
}

export async function savePendingScore(score: Omit<QuizScore, 'id' | 'synced'>): Promise<void> {
  const db = await getDB();
  await db.add('pending_scores', { ...score, synced: false });
}

export async function getPendingScores(): Promise<QuizScore[]> {
  const db = await getDB();
  return db.getAll('pending_scores');
}

export async function clearPendingScores(): Promise<void> {
  const db = await getDB();
  await db.clear('pending_scores');
}
