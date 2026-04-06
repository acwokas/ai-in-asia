
ALTER TABLE public.ai_guides DROP CONSTRAINT IF EXISTS ai_guides_primary_platform_check;

ALTER TABLE public.ai_guides ADD CONSTRAINT ai_guides_primary_platform_check 
  CHECK (primary_platform IN ('ChatGPT', 'Claude', 'Gemini', 'Generic', 'Midjourney', 'Perplexity', 'Copilot', 'NotebookLM', 'Cursor', 'Stable Diffusion', 'ElevenLabs', 'Suno', 'Runway', 'Lovable', 'v0'));

UPDATE ai_guides SET primary_platform = 'Lovable' WHERE slug LIKE 'lovable-%';
UPDATE ai_guides SET primary_platform = 'v0' WHERE slug LIKE 'v0-%';
