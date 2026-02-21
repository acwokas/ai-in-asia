
ALTER TABLE public.ai_guides ALTER COLUMN guide_category DROP NOT NULL;
ALTER TABLE public.ai_guides ALTER COLUMN guide_category SET DEFAULT 'Guide';
ALTER TABLE public.ai_guides DROP CONSTRAINT IF EXISTS ai_guides_guide_category_check;
ALTER TABLE public.ai_guides ADD CONSTRAINT ai_guides_guide_category_check
CHECK (guide_category IN ('Prompt List', 'Tutorial', 'Framework', 'Use Case', 'Platform Guide', 'Role Guide', 'Prompt Pack', 'Guide', 'Quick Guide', 'Deep Dive', 'Prompt Collection', 'Tool Pick'));
