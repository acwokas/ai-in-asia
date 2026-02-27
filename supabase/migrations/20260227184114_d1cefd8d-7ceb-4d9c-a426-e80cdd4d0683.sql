CREATE POLICY "temp_anon_insert_guides"
ON public.ai_guides
FOR INSERT
TO anon
WITH CHECK (true);