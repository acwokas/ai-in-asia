-- Update worth_watching column to store structured JSON with all sections
-- The column already exists, but we're changing its usage from text to JSONB
ALTER TABLE public.newsletter_editions 
DROP COLUMN IF EXISTS worth_watching;

ALTER TABLE public.newsletter_editions 
ADD COLUMN worth_watching JSONB DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.newsletter_editions.worth_watching IS 'Structured Worth Watching sections: trends, events, spotlight, policy';