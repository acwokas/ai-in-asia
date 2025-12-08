-- Drop the existing check constraint and add new one with updated values
ALTER TABLE public.ai_guides DROP CONSTRAINT IF EXISTS ai_guides_guide_category_check;

ALTER TABLE public.ai_guides ADD CONSTRAINT ai_guides_guide_category_check 
CHECK (guide_category IN ('Prompt List', 'Tutorial', 'Framework', 'Use Case', 'Platform Guide', 'Role Guide', 'Prompt Pack', 'Guide'));