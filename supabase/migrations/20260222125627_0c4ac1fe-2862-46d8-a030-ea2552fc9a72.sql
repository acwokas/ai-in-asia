
-- Add last_active_date to user_stats for streak tracking
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS last_active_date date;

-- Create comment_reactions table
CREATE TABLE public.comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction)
);

-- Enable RLS
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions
CREATE POLICY "Anyone can view comment reactions"
  ON public.comment_reactions FOR SELECT
  USING (true);

-- Authenticated users can insert their own reactions
CREATE POLICY "Users can insert their own reactions"
  ON public.comment_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reactions
CREATE POLICY "Users can delete their own reactions"
  ON public.comment_reactions FOR DELETE
  USING (auth.uid() = user_id);
