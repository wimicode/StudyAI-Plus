-- ============================================================
-- STUDYAI PLUS v2 – Supabase Database Migration
-- Colle ce contenu dans SQL Editor > Run
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
  language    TEXT NOT NULL DEFAULT 'fr',
  level       TEXT NOT NULL DEFAULT 'lycee'
                CHECK (level IN ('college','lycee','bac','superieur','autre')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FOLDERS (arborescence de dossiers)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.folders (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id  UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_folders_user_id   ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_id);
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD own folders" ON public.folders FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id      UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  language       TEXT NOT NULL DEFAULT 'fr',
  level          TEXT NOT NULL DEFAULT 'lycee',
  summary        TEXT,
  glossary       JSONB,
  key_concepts   JSONB,
  flashcards     JSONB,
  quiz_questions JSONB,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_courses_user_id   ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_folder_id ON public.courses(folder_id);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD own courses" ON public.courses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SOURCES (multi-formats : pdf, youtube, text, drive, image)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('pdf','youtube','text','drive','image')),
  title           TEXT,
  raw_url         TEXT,         -- URL Supabase Storage (pdf/image) ou lien externe (youtube/drive)
  raw_text        TEXT,         -- Texte brut extrait ou collé
  content_preview TEXT,         -- Premier extrait (300 chars) pour l'UI
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','processed','error')),
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sources_course_id ON public.sources(course_id);
CREATE INDEX IF NOT EXISTS idx_sources_user_id   ON public.sources(user_id);
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD own sources" ON public.sources FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- SHEETS (fiches personnalisées par blocs)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sheets (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  folder_id  UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  title      TEXT NOT NULL DEFAULT 'Nouvelle fiche',
  color      TEXT NOT NULL DEFAULT '#fde68a',
  blocks     JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sheets_user_id   ON public.sheets(user_id);
CREATE INDEX IF NOT EXISTS idx_sheets_course_id ON public.sheets(course_id);
ALTER TABLE public.sheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD own sheets" ON public.sheets FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER sheets_updated_at BEFORE UPDATE ON public.sheets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- EXAMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exams (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject          TEXT NOT NULL,
  exam_date        DATE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_exams_user_id ON public.exams(user_id);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD own exams" ON public.exams FOR ALL
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
CREATE POLICY "CRUD own study plans" ON public.study_plans FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- QUIZ SCORES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quiz_scores (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id  UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL CHECK (mode IN ('flashcard','quiz','exam')),
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  feedback   TEXT,
  synced     BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_user_id  ON public.quiz_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_scores_course_id ON public.quiz_scores(course_id);
ALTER TABLE public.quiz_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CRUD own scores" ON public.quiz_scores FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- STORAGE POLICIES (à exécuter après création du bucket)
-- Crée le bucket 'course-pdfs' dans Storage > New Bucket (public)
-- puis colle les lignes ci-dessous :
-- ============================================================
-- CREATE POLICY "upload own files"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'course-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
-- CREATE POLICY "public read files"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'course-pdfs');
-- CREATE POLICY "delete own files"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'course-pdfs' AND auth.uid()::text = (storage.foldername(name))[1]);
