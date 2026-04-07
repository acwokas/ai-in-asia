ALTER TABLE public.glossary_terms
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS asia_context text;