-- ============================================================
-- STUDYAI-PLUS – Supabase Database Migration v2
-- Run this in the Supabase SQL Editor to set up the schema.
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
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
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
  level          TEXT DEFAULT 'high_school',  -- primary / middle / high_school / university
  language       TEXT DEFAULT 'fr',
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

CREATE POLICY "Users can CRUD their own courses"
  ON public.courses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SOURCES (NOUVEAU - multi-types)
-- Une source = un contenu brut associé à un cours
-- Types : pdf | youtube | drive | text | image
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('pdf', 'youtube', 'drive', 'text', 'image')),
  title           TEXT,
  raw_url         TEXT,         -- URL du fichier Supabase Storage, ou lien YouTube/Drive
  storage_path    TEXT,         -- chemin dans Supabase Storage (pour PDF/images)
  content_text    TEXT,         -- texte extrait ou collé directement
  content_preview TEXT,         -- extrait court pour affichage
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_user_id   ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_course_id ON public.sources(course_id);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own sources"
  ON public.sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "Users can CRUD their own exams"
  ON public.exams FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE POLICY "Users can CRUD their own study plans"
  ON public.study_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_id  ON public.quiz_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_course_id ON public.quiz_scores(course_id);

ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own scores"
  ON public.quiz_scores FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- Créer dans Supabase Dashboard > Storage > New bucket
-- Nom : studyai-files | Public : oui
-- ============================================================

-- Policies Storage (coller après avoir créé le bucket) :
-- CREATE POLICY "Users can upload their own files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'studyai-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Files are publicly readable"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'studyai-files');

-- CREATE POLICY "Users can delete their own files"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'studyai-files' AND auth.uid()::text = (storage.foldername(name))[1]);
