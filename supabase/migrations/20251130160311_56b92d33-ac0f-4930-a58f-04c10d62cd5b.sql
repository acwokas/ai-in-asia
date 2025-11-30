-- Create prompt_ratings table to track user ratings for prompts
CREATE TABLE IF NOT EXISTS public.prompt_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt_item_id TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, prompt_item_id)
);

-- Enable RLS
ALTER TABLE public.prompt_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view ratings
CREATE POLICY "Anyone can view prompt ratings"
ON public.prompt_ratings
FOR SELECT
USING (true);

-- Policy: Authenticated users can insert their own ratings
CREATE POLICY "Users can rate prompts"
ON public.prompt_ratings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
ON public.prompt_ratings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_prompt_ratings_prompt_item ON public.prompt_ratings(prompt_item_id);
CREATE INDEX idx_prompt_ratings_article ON public.prompt_ratings(article_id);
CREATE INDEX idx_prompt_ratings_user ON public.prompt_ratings(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_prompt_rating_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_prompt_ratings_updated_at
  BEFORE UPDATE ON public.prompt_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_prompt_rating_updated_at();