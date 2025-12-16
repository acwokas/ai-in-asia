-- Fix homepage failures: allow public reads for FK joins while keeping author email private from anon users
-- 1) Table privileges: PostgREST requires SELECT privilege on the referenced table for FK joins
GRANT SELECT ON TABLE public.authors TO anon, authenticated;

-- 2) Column-level privacy: prevent anonymous users from selecting sensitive columns
--    (Admin UI uses authenticated role, so it remains unaffected.)
REVOKE SELECT (email) ON TABLE public.authors FROM anon;
REVOKE SELECT (user_id) ON TABLE public.authors FROM anon;

-- 3) Ensure only admins can change author records (defence-in-depth)
ALTER TABLE public.authors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage authors" ON public.authors;
CREATE POLICY "Admins can manage authors"
ON public.authors
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Keep/ensure public read policy for published-site needs
DROP POLICY IF EXISTS "Authors are publicly readable" ON public.authors;
CREATE POLICY "Authors are publicly readable"
ON public.authors
FOR SELECT
TO anon, authenticated
USING (true);


-- Security linter WARN fix: set immutable search_path for trigger function
CREATE OR REPLACE FUNCTION public.update_prompt_rating_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;