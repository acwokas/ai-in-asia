-- Allow anon users to read from authors table (needed for FK joins in article queries)
-- The authors_public view provides column-level restriction, but FK relationships need table access
CREATE POLICY "Authors are publicly readable"
ON public.authors
FOR SELECT
TO anon, authenticated
USING (true);

-- Drop the restrictive admin-only policy if it exists (it was blocking public reads)
DROP POLICY IF EXISTS "Admins can view all author data" ON public.authors;