-- Add parent_id to ai_generated_comments for threading support
ALTER TABLE public.ai_generated_comments 
ADD COLUMN parent_id UUID REFERENCES public.ai_generated_comments(id) ON DELETE CASCADE;

-- Create index for faster threaded comment queries
CREATE INDEX idx_ai_comments_parent_id ON public.ai_generated_comments(parent_id);
CREATE INDEX idx_ai_comments_article_parent ON public.ai_generated_comments(article_id, parent_id);