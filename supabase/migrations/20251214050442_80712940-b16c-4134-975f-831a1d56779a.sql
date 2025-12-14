-- Add published field to ai_generated_comments
ALTER TABLE public.ai_generated_comments 
ADD COLUMN IF NOT EXISTS published boolean DEFAULT false;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_comments_published ON public.ai_generated_comments(article_id, published);