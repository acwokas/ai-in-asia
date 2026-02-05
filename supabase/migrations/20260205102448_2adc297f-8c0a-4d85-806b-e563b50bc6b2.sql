-- Add missing roadmap columns
ALTER TABLE public.newsletter_editions 
  ADD COLUMN IF NOT EXISTS roadmap_body text,
  ADD COLUMN IF NOT EXISTS roadmap_worth_it_if text;

-- Add comments for documentation
COMMENT ON COLUMN public.newsletter_editions.roadmap_body IS 'Event description for the Roadmap section';
COMMENT ON COLUMN public.newsletter_editions.roadmap_worth_it_if IS 'Worth it if fragment for Roadmap event';