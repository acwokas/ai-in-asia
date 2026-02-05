-- Add missing newsletter section columns
ALTER TABLE public.newsletter_editions 
  ADD COLUMN IF NOT EXISTS weekly_promise text,
  ADD COLUMN IF NOT EXISTS adrians_take text,
  ADD COLUMN IF NOT EXISTS collective_one_liner text,
  ADD COLUMN IF NOT EXISTS roadmap_skip_if text;

-- Add comments for documentation
COMMENT ON COLUMN public.newsletter_editions.weekly_promise IS 'One sentence framing the core tension of the week (max 25 words)';
COMMENT ON COLUMN public.newsletter_editions.adrians_take IS 'Personal POV on the week theme (2-3 sentences)';
COMMENT ON COLUMN public.newsletter_editions.collective_one_liner IS 'One-line explainer for WithThePowerOf.AI collective (max 14 words)';
COMMENT ON COLUMN public.newsletter_editions.roadmap_skip_if IS 'Roadmap event skip condition';