-- Drop temporary anon INSERT policy
DROP POLICY IF EXISTS "Anon can insert glossary terms" ON public.glossary_terms;

-- Add admin management policies
CREATE POLICY "Admins can insert glossary terms"
ON public.glossary_terms
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update glossary terms"
ON public.glossary_terms
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete glossary terms"
ON public.glossary_terms
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));