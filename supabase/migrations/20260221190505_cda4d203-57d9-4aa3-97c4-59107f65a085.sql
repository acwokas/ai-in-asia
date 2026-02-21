ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS sources jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.articles.sources IS 'Array of source citations for policy articles: [{title, url, description}]';