-- Add worth_watching column to newsletter_editions for the "Worth Watching" section
ALTER TABLE public.newsletter_editions 
ADD COLUMN IF NOT EXISTS worth_watching TEXT;