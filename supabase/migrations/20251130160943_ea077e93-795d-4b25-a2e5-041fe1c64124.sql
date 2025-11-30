-- 1. BOOKMARK SYSTEM
-- User collections for organizing bookmarks
CREATE TABLE IF NOT EXISTS public.prompt_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Bookmarked prompts
CREATE TABLE IF NOT EXISTS public.prompt_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt_item_id TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.prompt_collections(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, prompt_item_id)
);

-- 2. PROMPT VARIATIONS (Community Contributions)
CREATE TABLE IF NOT EXISTS public.prompt_variations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_prompt_id TEXT NOT NULL,
  original_article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  variation_text TEXT NOT NULL,
  explanation TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  moderated_by UUID,
  moderated_at TIMESTAMP WITH TIME ZONE,
  points_awarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TRACKING (for personal history)
CREATE TABLE IF NOT EXISTS public.prompt_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  prompt_item_id TEXT NOT NULL,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS POLICIES
ALTER TABLE public.prompt_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_views ENABLE ROW LEVEL SECURITY;

-- Collections policies
CREATE POLICY "Users can view their own collections"
ON public.prompt_collections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own collections"
ON public.prompt_collections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
ON public.prompt_collections FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
ON public.prompt_collections FOR DELETE
USING (auth.uid() = user_id);

-- Bookmarks policies
CREATE POLICY "Users can view their own bookmarks"
ON public.prompt_bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
ON public.prompt_bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
ON public.prompt_bookmarks FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
ON public.prompt_bookmarks FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Variations policies
CREATE POLICY "Anyone can view approved variations"
ON public.prompt_variations FOR SELECT
USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can submit variations"
ON public.prompt_variations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending variations"
ON public.prompt_variations FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can moderate variations"
ON public.prompt_variations FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Views tracking policies
CREATE POLICY "Users can log their own views"
ON public.prompt_views FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own history"
ON public.prompt_views FOR SELECT
USING (auth.uid() = user_id);

-- INDEXES
CREATE INDEX idx_prompt_collections_user ON public.prompt_collections(user_id);
CREATE INDEX idx_prompt_bookmarks_user ON public.prompt_bookmarks(user_id);
CREATE INDEX idx_prompt_bookmarks_prompt ON public.prompt_bookmarks(prompt_item_id);
CREATE INDEX idx_prompt_variations_original ON public.prompt_variations(original_prompt_id);
CREATE INDEX idx_prompt_variations_status ON public.prompt_variations(status);
CREATE INDEX idx_prompt_views_user ON public.prompt_views(user_id);
CREATE INDEX idx_prompt_views_prompt ON public.prompt_views(prompt_item_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_collection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_prompt_collections_updated_at
  BEFORE UPDATE ON public.prompt_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_updated_at();

CREATE TRIGGER update_prompt_variations_updated_at
  BEFORE UPDATE ON public.prompt_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_updated_at();