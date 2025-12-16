-- Fix 1: Restrict article-images bucket to admin-only uploads
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;

-- Create admin-only upload policy
CREATE POLICY "Admins can upload article images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'article-images' AND
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add admin-only update policy
CREATE POLICY "Admins can update article images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'article-images' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add admin-only delete policy
CREATE POLICY "Admins can delete article images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'article-images' AND 
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Add file size and MIME type limits to article-images bucket
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB limit
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
WHERE id = 'article-images';

-- Fix 2: Restrict authors table access - use public view instead
-- Revoke direct table access from anonymous users
REVOKE SELECT ON public.authors FROM anon;

-- Grant access only through the public view (no emails)
GRANT SELECT ON public.authors_public TO anon;

-- Authenticated users also use the view for general access
GRANT SELECT ON public.authors_public TO authenticated;

-- Create admin-only policy for full authors table access
DROP POLICY IF EXISTS "Anyone can view authors" ON public.authors;

CREATE POLICY "Admins can view all author data"
ON public.authors FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));