-- ============================================================
-- STUDYAI-PLUS – Supabase Database Migration v2
-- Inspiré par StudyAI de lucgus11 (https://github.com/lucgus11/StudyAI)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  language    TEXT DEFAULT 'fr',
  level       TEXT DEFAULT 'lycee',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  language       TEXT DEFAULT 'fr',
  level          TEXT DEFAULT 'lycee',
  summary        TEXT,
  glossary       JSONB,
  key_concepts   JSONB,
  flashcards     JSONB,
  quiz_questions JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own courses" ON public.courses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SOURCES (NEW in v2)
-- Une source = PDF, YouTube, Drive, texte collé, image
-- Plusieurs sources peuvent être liées à un seul cours
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('pdf', 'youtube', 'drive', 'text', 'image')),
  title           TEXT,
  raw_url         TEXT,
  pdf_path        TEXT,
  pdf_url         TEXT,
  text_content    TEXT,
  transcript      TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'error')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_user_id   ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_course_id ON public.sources(course_id);
CREATE INDEX IF NOT EXISTS idx_sources_status    ON public.sources(status);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own sources" ON public.sources FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- EXAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject          TEXT NOT NULL,
  exam_date        DATE NOT NULL,
  duration_minutes INTEGER,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own exams" ON public.exams FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STUDY PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.study_plans (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_data    JSONB NOT NULL DEFAULT '[]',
  weeks_count  INTEGER NOT NULL DEFAULT 4,
  daily_hours  INTEGER NOT NULL DEFAULT 4,
  rest_days    JSONB NOT NULL DEFAULT '["saturday","sunday"]',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON public.study_plans(user_id);
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own study plans" ON public.study_plans FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- QUIZ SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL CHECK (mode IN ('flashcard', 'quiz', 'exam')),
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  feedback   TEXT,
  synced     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_id   ON public.quiz_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_course_id ON public.quiz_scores(course_id);
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own scores" ON public.quiz_scores FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKET (run in Supabase Dashboard > Storage)
-- Bucket name: course-pdfs (public: true)
-- Then run these policies:
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-pdfs', 'course-pdfs', true);

-- CREATE POLICY "Users upload own PDFs"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'course-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "PDFs publicly readable"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'course-pdfs');

-- CREATE POLICY "Users delete own PDFs"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'course-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
