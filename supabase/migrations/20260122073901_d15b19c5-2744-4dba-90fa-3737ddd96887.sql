-- Drop and recreate the authors_public view to include linkedin_url and website_url
-- These are public social links, not sensitive information like email

DROP VIEW IF EXISTS public.authors_public;

CREATE VIEW public.authors_public
WITH (security_invoker=on) AS
SELECT 
  id,
  name,
  slug,
  avatar_url,
  bio,
  job_title,
  twitter_handle,
  linkedin_url,
  website_url,
  is_featured,
  article_count,
  created_at,
  updated_at
FROM public.authors;

-- Grant access to the updated view
GRANT SELECT ON public.authors_public TO anon, authenticated;

-- Update RLS policy to deny direct SELECT access for non-admins
-- Admins still need direct access for management
DROP POLICY IF EXISTS "Authors are publicly readable" ON public.authors;
DROP POLICY IF EXISTS "Public can view authors" ON public.authors;

-- Create a restrictive policy that only allows admins direct access
CREATE POLICY "Only admins can directly access authors table"
ON public.authors
FOR SELECT
TO anon, authenticated
USING (has_role(auth.uid(), 'admin'::app_role));