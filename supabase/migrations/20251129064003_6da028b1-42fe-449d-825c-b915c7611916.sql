-- Add intro and outro fields for Top Lists articles
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS top_list_intro TEXT,
ADD COLUMN IF NOT EXISTS top_list_outro TEXT;