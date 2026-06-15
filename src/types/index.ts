// ============================================================
// Types TypeScript — StudyAI-Plus
// ============================================================

export type SourceType = 'pdf' | 'youtube' | 'drive' | 'text' | 'image'
export type SourceStatus = 'pending' | 'processing' | 'done' | 'error'

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
  created_at: string
}

export interface Course {
  id: string
  user_id: string
  title: string
  subject: string
  level: string
  language: string
  summary?: string
  glossary?: { term: string; definition: string }[]
  key_concepts?: { concept: string; explanation: string }[]
  flashcards?: Flashcard[]
  quiz_questions?: QuizQuestion[]
  created_at: string
  updated_at: string
}

export interface Flashcard {
  front: string
  back: string
  mastered?: boolean
}

export interface QuizQuestion {
  question: string
  type: 'mcq' | 'truefalse'
  options?: string[]
  correctAnswer: string
  explanation: string
}

export interface ExamPart {
  title: string
  questions: ExamQuestion[]
}

export interface ExamQuestion {
  number: number
  question: string
  points: number
  type: string
}

export interface Exam {
  title: string
  duration_minutes: number
  instructions: string
  parts: ExamPart[]
  total_points: number
}

export interface ExamCorrection {
  score: number
  total: number
  percentage: number
  global_feedback: string
  corrections: {
    question_number: number
    student_answer: string
    correct_answer: string
    is_correct: boolean
    feedback: string
    points_earned: number
  }[]
}

export interface StudyPlanEntry {
  week: number
  day: string
  date: string
  subject: string
  duration_hours: number
  task: string
  tips: string
}

export interface QuizScore {
  id: string
  user_id: string
  course_id: string
  mode: 'flashcard' | 'quiz' | 'exam'
  score: number
  total: number
  feedback?: string
  synced: boolean
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at: string
}
