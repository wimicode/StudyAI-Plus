-- Ajoute la colonne pour stocker le crash test (examen blanc) généré à la
-- demande, séparément des flashcards/quiz. Sûr à exécuter plusieurs fois.
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS exam_content JSONB;

NOTIFY pgrst, 'reload schema';
