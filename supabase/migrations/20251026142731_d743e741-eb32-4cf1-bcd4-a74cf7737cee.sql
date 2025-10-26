-- Add RLS policies for articles table

-- Allow admins to do everything with articles
CREATE POLICY "Admins can manage all articles"
ON public.articles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow everyone to view published articles
CREATE POLICY "Anyone can view published articles"
ON public.articles
FOR SELECT
USING (status = 'published');

-- Allow authenticated users to view their own drafts
CREATE POLICY "Users can view their own articles"
ON public.articles
FOR SELECT
TO authenticated
USING (created_by = auth.uid());