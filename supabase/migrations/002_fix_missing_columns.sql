-- ============================================================
-- StudyAI Plus – Script de réparation du schéma
-- Sûr à exécuter même si les tables/colonnes existent déjà
-- (utilise IF NOT EXISTS partout, ne supprime ni ne modifie
-- aucune donnée existante).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── COURSES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.courses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  subject        TEXT NOT NULL,
  status         TEXT DEFAULT 'draft',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status         TEXT DEFAULT 'draft';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS language       TEXT DEFAULT 'fr';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS level          TEXT DEFAULT 'lycee';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS summary        TEXT;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS glossary       JSONB;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS key_concepts   JSONB;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS flashcards     JSONB;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS quiz_questions JSONB;

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON public.courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own courses" ON public.courses;
CREATE POLICY "Users can CRUD their own courses"
  ON public.courses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── SOURCES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sources (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  type            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS title           TEXT;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS raw_url         TEXT;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS storage_path    TEXT;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS content_text    TEXT;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS content_preview TEXT;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS status          TEXT DEFAULT 'pending';
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS error_message   TEXT;
ALTER TABLE public.sources ADD COLUMN IF NOT EXISTS metadata        JSONB;

CREATE INDEX IF NOT EXISTS idx_sources_user_id ON public.sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_course_id ON public.sources(course_id);
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own sources" ON public.sources;
CREATE POLICY "Users can CRUD their own sources"
  ON public.sources FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Rafraîchir le cache de schéma PostgREST ──────────────────
-- Force Supabase à relire le schéma immédiatement (sinon le cache
-- peut rester périmé jusqu'à 60s après une modification de structure).
NOTIFY pgrst, 'reload schema';
