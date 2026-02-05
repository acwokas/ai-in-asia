-- Add permalink_url column to newsletter_editions
ALTER TABLE public.newsletter_editions 
ADD COLUMN IF NOT EXISTS permalink_url text;