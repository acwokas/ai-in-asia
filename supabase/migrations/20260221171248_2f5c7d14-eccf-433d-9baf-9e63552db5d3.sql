
-- Create the ai_guide_prompts table
CREATE TABLE public.ai_guide_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.ai_guides(id) ON DELETE CASCADE,
  prompt_title TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  what_to_expect TEXT,
  platforms TEXT[] DEFAULT '{}',
  category TEXT,
  sort_order INTEGER DEFAULT 0,
  copy_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_guide_prompts ENABLE ROW LEVEL SECURITY;

-- Public read access (prompts are public content)
CREATE POLICY "Prompts are publicly readable"
  ON public.ai_guide_prompts
  FOR SELECT
  USING (true);

-- Admin-only write access
CREATE POLICY "Admins can insert prompts"
  ON public.ai_guide_prompts
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prompts"
  ON public.ai_guide_prompts
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prompts"
  ON public.ai_guide_prompts
  FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Index for fast lookups by guide
CREATE INDEX idx_guide_prompts_guide_id ON public.ai_guide_prompts(guide_id);

-- Index for sorting
CREATE INDEX idx_guide_prompts_sort ON public.ai_guide_prompts(guide_id, sort_order);
