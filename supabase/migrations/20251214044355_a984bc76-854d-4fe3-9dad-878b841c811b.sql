-- Drop the existing check constraint and add a new one with all regions
ALTER TABLE public.ai_comment_authors DROP CONSTRAINT IF EXISTS ai_comment_authors_region_check;

ALTER TABLE public.ai_comment_authors ADD CONSTRAINT ai_comment_authors_region_check 
CHECK (region IN ('singapore', 'india', 'philippines', 'hong_kong', 'west', 'china', 'usa', 'france', 'uk', 'japan', 'korea', 'indonesia', 'thailand', 'vietnam', 'malaysia'));