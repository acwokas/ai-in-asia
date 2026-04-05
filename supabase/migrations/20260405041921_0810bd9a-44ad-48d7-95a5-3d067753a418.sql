
-- Recreate the authors_public view WITHOUT security_invoker
-- so anonymous/non-admin users can read public author data
DROP VIEW IF EXISTS public.authors_public;

CREATE VIEW public.authors_public AS
  SELECT id, name, slug, avatar_url, bio, job_title,
         twitter_handle, linkedin_url, website_url,
         is_featured, article_count, created_at, updated_at
  FROM public.authors;

-- Grant SELECT to anon and authenticated roles
GRANT SELECT ON public.authors_public TO anon, authenticated;
