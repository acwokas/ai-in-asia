-- Add is_featured column to authors table
ALTER TABLE public.authors 
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Create index for featured authors
CREATE INDEX IF NOT EXISTS idx_authors_featured 
ON public.authors(is_featured) 
WHERE is_featured = true;

-- Update authors_public view to include is_featured
DROP VIEW IF EXISTS public.authors_public;
CREATE OR REPLACE VIEW public.authors_public AS
SELECT 
  id,
  name,
  slug,
  avatar_url,
  bio,
  job_title,
  twitter_handle,
  article_count,
  is_featured,
  created_at,
  updated_at
FROM public.authors;

-- Create author-avatars storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'author-avatars',
  'author-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for public read on author avatars
CREATE POLICY "Public can view author avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'author-avatars');

-- RLS policy for admin upload on author avatars
CREATE POLICY "Admins can upload author avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'author-avatars' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy for admin update on author avatars
CREATE POLICY "Admins can update author avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'author-avatars' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy for admin delete on author avatars
CREATE POLICY "Admins can delete author avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'author-avatars' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Mark Intelligence Desk as featured by default
UPDATE public.authors
SET is_featured = true
WHERE slug = 'intelligence-desk';