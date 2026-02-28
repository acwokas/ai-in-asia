
CREATE TABLE IF NOT EXISTS public.guide_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  guide_id UUID NOT NULL REFERENCES public.ai_guides(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, guide_id)
);

ALTER TABLE public.guide_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own guide bookmarks"
  ON public.guide_bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guide bookmarks"
  ON public.guide_bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guide bookmarks"
  ON public.guide_bookmarks FOR DELETE
  USING (auth.uid() = user_id);
