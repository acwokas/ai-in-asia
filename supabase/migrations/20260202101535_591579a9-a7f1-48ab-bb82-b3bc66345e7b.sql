-- Add ai_summary column to newsletter_top_stories for AI-generated article summaries
ALTER TABLE public.newsletter_top_stories 
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Add ai_generated_at column to newsletter_editions to track AI content generation
ALTER TABLE public.newsletter_editions 
ADD COLUMN IF NOT EXISTS ai_generated_at TIMESTAMP WITH TIME ZONE;

-- Add worth_watching column to newsletter_editions if not exists
ALTER TABLE public.newsletter_editions 
ADD COLUMN IF NOT EXISTS worth_watching TEXT;