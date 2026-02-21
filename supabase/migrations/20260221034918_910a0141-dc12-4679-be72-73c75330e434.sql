
-- Create article_reactions table
CREATE TABLE public.article_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  reaction_type text NOT NULL CHECK (reaction_type IN ('insightful', 'important', 'surprising', 'outdated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Unique constraint for logged-in users (one reaction per article)
  CONSTRAINT unique_user_reaction UNIQUE (article_id, user_id),
  -- Unique constraint for anonymous users (one reaction type per session per article)
  CONSTRAINT unique_session_reaction UNIQUE (article_id, session_id, reaction_type),
  -- Must have either user_id or session_id
  CONSTRAINT must_have_identity CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

-- Enable RLS
ALTER TABLE public.article_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reaction counts
CREATE POLICY "Anyone can view reactions"
  ON public.article_reactions FOR SELECT
  USING (true);

-- Anyone can insert reactions (anonymous or logged in)
CREATE POLICY "Anyone can insert reactions"
  ON public.article_reactions FOR INSERT
  WITH CHECK (true);

-- Anyone can update their own reactions
CREATE POLICY "Users can update own reactions"
  ON public.article_reactions FOR UPDATE
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (session_id IS NOT NULL AND user_id IS NULL)
  );

-- Anyone can delete their own reactions
CREATE POLICY "Users can delete own reactions"
  ON public.article_reactions FOR DELETE
  USING (
    (user_id IS NOT NULL AND user_id = auth.uid()) OR
    (session_id IS NOT NULL AND user_id IS NULL)
  );

-- Index for fast lookups
CREATE INDEX idx_article_reactions_article ON public.article_reactions(article_id);
CREATE INDEX idx_article_reactions_session ON public.article_reactions(session_id) WHERE session_id IS NOT NULL;
