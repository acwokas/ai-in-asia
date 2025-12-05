-- Create ai_guides table
CREATE TABLE public.ai_guides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  guide_category TEXT NOT NULL CHECK (guide_category IN ('Prompt List', 'Tutorial', 'Framework', 'Use Case', 'Platform Guide', 'Role Guide', 'Prompt Pack')),
  level TEXT NOT NULL CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'Mixed')),
  primary_platform TEXT NOT NULL CHECK (primary_platform IN ('Generic', 'ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'Runway', 'ElevenLabs', 'Other')),
  audience_role TEXT,
  geo TEXT,
  excerpt TEXT,
  seo_title TEXT,
  meta_title TEXT,
  meta_description TEXT,
  focus_keyphrase TEXT,
  keyphrase_synonyms TEXT,
  tags TEXT,
  tldr_bullet_1 TEXT,
  tldr_bullet_2 TEXT,
  tldr_bullet_3 TEXT,
  perfect_for TEXT,
  body_intro TEXT,
  body_section_1_heading TEXT,
  body_section_1_text TEXT,
  body_section_2_heading TEXT,
  body_section_2_text TEXT,
  body_section_3_heading TEXT,
  body_section_3_text TEXT,
  prompt_1_label TEXT,
  prompt_1_headline TEXT,
  prompt_1_text TEXT,
  prompt_2_label TEXT,
  prompt_2_headline TEXT,
  prompt_2_text TEXT,
  prompt_3_label TEXT,
  prompt_3_headline TEXT,
  prompt_3_text TEXT,
  faq_q1 TEXT,
  faq_a1 TEXT,
  faq_q2 TEXT,
  faq_a2 TEXT,
  faq_q3 TEXT,
  faq_a3 TEXT,
  image_prompt TEXT,
  closing_cta TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.ai_guides ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view ai_guides"
ON public.ai_guides
FOR SELECT
USING (true);

-- Admin-only write access
CREATE POLICY "Admins can manage ai_guides"
ON public.ai_guides
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index on slug for fast lookups
CREATE INDEX idx_ai_guides_slug ON public.ai_guides(slug);

-- Create index on filters
CREATE INDEX idx_ai_guides_category ON public.ai_guides(guide_category);
CREATE INDEX idx_ai_guides_platform ON public.ai_guides(primary_platform);
CREATE INDEX idx_ai_guides_level ON public.ai_guides(level);

-- Trigger for updated_at
CREATE TRIGGER update_ai_guides_updated_at
BEFORE UPDATE ON public.ai_guides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();