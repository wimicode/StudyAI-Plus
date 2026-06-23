-- ============================================================
-- Permet plusieurs générations (flashcards/quiz/exam) par cours,
-- chacune avec un titre donné par l'IA et une date de création.
-- Les anciennes colonnes (flashcards, quiz_questions, exam_content)
-- restent en place pour compatibilité mais ne sont plus utilisées
-- pour les nouvelles générations.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.generations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('flashcards', 'quiz', 'exam')),
  title       TEXT NOT NULL,
  content     JSONB NOT NULL,
  settings    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generations_course_id ON public.generations(course_id);
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON public.generations(type);

ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can CRUD their own generations" ON public.generations;
CREATE POLICY "Users can CRUD their own generations"
  ON public.generations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
