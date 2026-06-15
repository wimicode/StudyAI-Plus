// ============================================================
// STUDYAI-PLUS – TypeScript Types
// ============================================================

export type SourceType = 'pdf' | 'youtube' | 'drive' | 'text' | 'image';
export type SourceStatus = 'pending' | 'processing' | 'processed' | 'error';
export type CourseLevel = 'college' | 'lycee' | 'bac' | 'superieur';
export type QuizMode = 'flashcard' | 'quiz' | 'exam';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  language: string;
  level: CourseLevel;
  created_at: string;
}

export interface Source {
  id: string;
  user_id: string;
  course_id: string | null;
  type: SourceType;
  title: string | null;
  raw_url: string | null;
  pdf_path: string | null;
  pdf_url: string | null;
  text_content: string | null;
  transcript: string | null;
  status: SourceStatus;
  error_message: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  language: string;
  level: CourseLevel;
  summary: string | null;
  glossary: GlossaryItem[] | null;
  key_concepts: KeyConcept[] | null;
  flashcards: Flashcard[] | null;
  quiz_questions: QuizQuestion[] | null;
  created_at: string;
  updated_at: string;
  sources?: Source[];
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface KeyConcept {
  title: string;
  explanation: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'mcq' | 'true_false' | 'open';
  options?: string[];
  correct_answer: string;
  explanation?: string;
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

export interface StudyDay {
  date: string;
  tasks: StudyTask[];
}

export interface StudyTask {
  subject: string;
  course_title: string;
  duration_minutes: number;
  mode: 'review' | 'flashcard' | 'quiz' | 'exam';
}

export interface QuizScore {
  id: string;
  user_id: string;
  course_id: string;
  mode: QuizMode;
  score: number;
  total: number;
  feedback: string | null;
  synced: boolean;
  created_at: string;
}
