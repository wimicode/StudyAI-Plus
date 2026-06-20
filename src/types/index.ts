// ============================================================
// StudyAI Plus – TypeScript Types
// ============================================================

export type SourceType = 'pdf' | 'youtube' | 'text' | 'drive' | 'image'
export type SourceStatus = 'pending' | 'processing' | 'processed' | 'error'
export type CourseStatus = 'draft' | 'processing' | 'ready' | 'error'
export type QuizMode = 'flashcard' | 'quiz' | 'exam'
export type UserLevel = '1s' | '2s' | '3s' | '4s' | '5s' | '6s' | 'uni' | 'college' | 'lycee' | 'bac' | 'superieur' | 'autre'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  level: UserLevel
  language: string
  created_at: string
}

export interface Source {
  id: string
  user_id: string
  course_id?: string
  type: SourceType
  title?: string
  raw_url?: string
  storage_path?: string
  content_text?: string
  content_preview?: string
  status: SourceStatus
  error_message?: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Flashcard {
  front: string
  back: string
  difficulty: Difficulty
}

export interface QuizQuestion {
  question: string
  type: 'mcq' | 'true_false'
  options: string[]
  correct: string
  explanation: string
}

export interface ExamSection {
  title: string
  questions: ExamQuestion[]
}

export interface ExamQuestion {
  id: string
  question: string
  type: 'mcq' | 'open' | 'true_false'
  options?: string[]
  points: number
}

export interface Exam {
  title: string
  duration: number
  instructions: string
  sections: ExamSection[]
}

export interface GlossaryEntry {
  term: string
  definition: string
}

export interface KeyConcept {
  concept: string
  explanation: string
  difficulty: Difficulty
}

export interface Course {
  id: string
  user_id: string
  title: string
  subject: string
  language: string
  level: UserLevel
  summary?: string
  glossary?: GlossaryEntry[]
  key_concepts?: KeyConcept[]
  flashcards?: Flashcard[]
  quiz_questions?: QuizQuestion[]
  exam_content?: ExamContent
  status: CourseStatus
  created_at: string
  updated_at: string
}

export interface ExamContent {
  title: string
  duration: number
  instructions: string
  sections: {
    title: string
    questions: {
      id: string
      question: string
      type: 'mcq' | 'open' | 'true_false'
      options: string[]
      points: number
    }[]
  }[]
}

export interface Exam_ {
  id: string
  user_id: string
  subject: string
  exam_date: string
  duration_minutes?: number
  notes?: string
  created_at: string
}

export interface StudyPlanDay {
  date: string
  sessions: StudySession[]
}

export interface StudySession {
  subject: string
  duration_minutes: number
  mode: 'lecture' | 'flashcards' | 'quiz' | 'exam'
  notes?: string
}

export interface StudyPlanWeek {
  week: number
  days: StudyPlanDay[]
}

export interface StudyPlan {
  id: string
  user_id: string
  plan_data: StudyPlanWeek[]
  weeks_count: number
  daily_hours: number
  rest_days: string[]
  generated_at: string
}

/** Entrée plate renvoyée par /api/planner/generate et utilisée dans PlannerPage */
export interface StudyPlanEntry {
  date: string
  subject: string
  task: string
  tips?: string
  duration_hours: number
}

export interface QuizScore {
  id: string
  user_id?: string
  course_id?: string
  mode: QuizMode
  score: number
  total: number
  percentage?: number
  feedback?: string
  synced: boolean
  created_at: string
}

export interface ExamResult {
  score: number
  total: number
  percentage: number
  grade: string
  feedback: string
  corrections: Array<{
    question_id: string
    correct: boolean
    explanation: string
  }>
}
