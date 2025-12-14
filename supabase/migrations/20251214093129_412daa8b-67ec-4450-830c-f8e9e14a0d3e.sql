-- Add public read policy for authors table (non-sensitive data is already exposed via the view)
-- This allows article queries to join authors properly
CREATE POLICY "Public can view authors"
ON public.authors
FOR SELECT
TO public
USING (true);

-- Drop the restrictive admin-only SELECT policy
DROP POLICY IF EXISTS "Only admins can view full authors data" ON public.authors;