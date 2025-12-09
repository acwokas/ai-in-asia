-- Drop the overly permissive policy that exposes email
DROP POLICY IF EXISTS "Anyone can view authors" ON public.authors;

-- Create a new policy that only allows admins to view the full authors table
CREATE POLICY "Only admins can view full authors data"
ON public.authors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Ensure the authors_public view exists and is accessible
-- (It already exists based on the types, but let's make sure it's correct)
DROP VIEW IF EXISTS public.authors_public;

CREATE VIEW public.authors_public AS
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