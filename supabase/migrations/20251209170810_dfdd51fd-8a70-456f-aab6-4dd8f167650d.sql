-- Drop and recreate the view with SECURITY INVOKER (default, but explicit is better)
DROP VIEW IF EXISTS public.authors_public;

CREATE VIEW public.authors_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  slug,
  avatar_url,
  bio,
  job_title,
  twitter_handle,
  is_featured,
  article_count,
  created_at,
  updated_at
FROM public.authors;

-- Grant public access to the view
GRANT SELECT ON public.authors_public TO anon, authenticated;