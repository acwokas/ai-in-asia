-- Add continuity_line column to newsletter_editions table
ALTER TABLE public.newsletter_editions 
ADD COLUMN IF NOT EXISTS continuity_line TEXT;