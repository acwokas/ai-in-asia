-- Add prompt_copies table to track statistics
CREATE TABLE IF NOT EXISTS public.prompt_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  prompt_item_id TEXT NOT NULL,
  copied_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_prompt_copies_article_id ON public.prompt_copies(article_id);
CREATE INDEX IF NOT EXISTS idx_prompt_copies_prompt_item_id ON public.prompt_copies(prompt_item_id);
CREATE INDEX IF NOT EXISTS idx_prompt_copies_copied_at ON public.prompt_copies(copied_at DESC);

-- Enable RLS
ALTER TABLE public.prompt_copies ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert copy tracking (anonymous or authenticated)
CREATE POLICY "Anyone can log prompt copies"
  ON public.prompt_copies
  FOR INSERT
  WITH CHECK (true);

-- Only admins can view statistics
CREATE POLICY "Admins can view prompt copy statistics"
  ON public.prompt_copies
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));