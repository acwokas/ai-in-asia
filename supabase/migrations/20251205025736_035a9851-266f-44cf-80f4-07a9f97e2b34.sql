-- Drop the existing check constraint and add a new one with TikTok included
ALTER TABLE public.ai_guides DROP CONSTRAINT IF EXISTS ai_guides_primary_platform_check;

ALTER TABLE public.ai_guides ADD CONSTRAINT ai_guides_primary_platform_check 
CHECK (primary_platform IN ('ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Runway', 'ElevenLabs', 'TikTok', 'Other', 'Generic'));