CREATE POLICY "Anon can insert glossary terms"
ON public.glossary_terms
FOR INSERT
TO anon
WITH CHECK (true);