
ALTER TABLE public.ai_guides ALTER COLUMN primary_platform DROP NOT NULL;
ALTER TABLE public.ai_guides ALTER COLUMN primary_platform SET DEFAULT 'Generic';
ALTER TABLE public.ai_guides ALTER COLUMN level DROP NOT NULL;
ALTER TABLE public.ai_guides ALTER COLUMN level SET DEFAULT 'Intermediate';
