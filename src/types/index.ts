// ============================================================
// STUDYAI PLUS v2 – Type Definitions
// ============================================================

export type Json =
  | string | number | boolean | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---- Database Types ----

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  language: string;
  level: 'college' | 'lycee' | 'bac' | 'superieur' | 'autre';
  created_at: string;
}

export type SourceType = 'pdf' | 'youtube' | 'text' | 'drive' | 'image';
export type SourceStatus = 'pending' | 'processing' | 'processed' | 'error';

export interface Source {
  id: string;
  user_id: string;
  course_id: string;
  type: SourceType;
  title: string | null;
  raw_url: string | null;
  raw_text: string | null;
  content_preview: string | null;
  status: SourceStatus;
  error_message: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  folder_id: string | null;
  title: string;
  subject: string;
  language: string;
  level: string;
  summary: string | null;
  glossary: GlossaryTerm[] | null;
  key_concepts: string[] | null;
  flashcards: Flashcard[] | null;
  quiz_questions: QuizQuestion[] | null;
  created_at: string;
  updated_at: string;
  // Relations client-side
  sources?: Source[];
}

export interface Folder {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  children?: Folder[];
  sheetCount?: number;
}

export interface Sheet {
  id: string;
  user_id: string;
  course_id: string | null;
  folder_id: string | null;
  title: string;
  color: string;
  blocks: Block[];
  created_at: string;
  updated_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject: string;
  exam_date: string;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  plan_data: StudyDay[];
  weeks_count: number;
  daily_hours: number;
  rest_days: string[];
  generated_at: string;
}

export interface QuizScore {
  id: string;
  user_id: string;
  course_id: string;
  mode: 'flashcard' | 'quiz' | 'exam';
  score: number;
  total: number;
  feedback: string | null;
  synced: boolean;
  created_at: string;
}

// ---- AI-Generated Content Types ----

export interface GlossaryTerm {
  term: string;
  definition: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  // Spaced repetition (SM-2 light)
  interval?: number;     // jours jusqu'à prochaine révision
  easeFactor?: number;   // facteur de facilité (défaut 2.5)
  repetitions?: number;  // nombre de révisions correctes consécutives
  nextReview?: string;   // ISO date prochaine révision
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'true_false';
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export interface ExamQuestion {
  id: string;
  question: string;
  type: 'open' | 'mcq' | 'true_false';
  options?: string[];
  correct_answer: string;
  points: number;
  explanation?: string;
}

export interface StudyDay {
  date: string;
  isRestDay: boolean;
  sessions: StudySession[];
}

export interface StudySession {
  subject: string;
  duration: number;
  topics: string[];
  priority: 'high' | 'medium' | 'low';
}

// ---- Planner Input Types ----

export interface PlannerFormData {
  exams: ExamInput[];
  weeksBeforeStart: number;
  dailyHours: number;
  restDays: string[];
}

export interface ExamInput {
  subject: string;
  date: string;
  importance: 'high' | 'medium' | 'low';
}

// ---- Offline / IndexedDB Types ----

export interface OfflineCourse {
  id: string;
  title: string;
  subject: string;
  pdfBlob?: Blob;
  summary: string | null;
  glossary: GlossaryTerm[] | null;
  key_concepts: string[] | null;
  flashcards: Flashcard[] | null;
  quiz_questions: QuizQuestion[] | null;
  cachedAt: string;
}

export interface PendingScore {
  id: string;
  courseId: string;
  mode: 'flashcard' | 'quiz' | 'exam';
  score: number;
  total: number;
  feedback: string | null;
  createdAt: string;
}

// ---- UI Types ----

export type RevisionMode = 'grand-ecran' | 'micro-learning' | 'crash-test';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

// ---- Sheet Blocks ----

export type BlockType =
  | 'heading1' | 'heading2' | 'text' | 'definition'
  | 'keypoint' | 'table' | 'timeline' | 'formula' | 'divider';

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  subtitle?: string;
  color?: string;
  rows?: string[][];
  items?: { date: string; event: string }[];
}

export const SHEET_COLORS = [
  { value: '#fde68a', label: 'Jaune' },
  { value: '#bbf7d0', label: 'Vert' },
  { value: '#bfdbfe', label: 'Bleu' },
  { value: '#fecaca', label: 'Rose' },
  { value: '#e9d5ff', label: 'Violet' },
  { value: '#fed7aa', label: 'Orange' },
  { value: '#f1f5f9', label: 'Blanc' },
];
