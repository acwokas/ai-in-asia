-- Add new tutorial fields to ai_guides table
ALTER TABLE public.ai_guides
ADD COLUMN IF NOT EXISTS context_and_background text,
ADD COLUMN IF NOT EXISTS expanded_steps text,
ADD COLUMN IF NOT EXISTS deeper_explanations text,
ADD COLUMN IF NOT EXISTS variations_and_alternatives text,
ADD COLUMN IF NOT EXISTS interactive_elements text,
ADD COLUMN IF NOT EXISTS troubleshooting_and_advanced_tips text;