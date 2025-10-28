-- Create category_sponsors table
CREATE TABLE public.category_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  sponsor_name TEXT NOT NULL,
  sponsor_logo_url TEXT NOT NULL,
  sponsor_website_url TEXT NOT NULL,
  sponsor_tagline TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

-- Enable RLS
ALTER TABLE public.category_sponsors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active category sponsors"
ON public.category_sponsors
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage category sponsors"
ON public.category_sponsors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_category_sponsors_updated_at
BEFORE UPDATE ON public.category_sponsors
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert PromptandGo as sponsor for Create category
INSERT INTO public.category_sponsors (category_id, sponsor_name, sponsor_logo_url, sponsor_website_url, sponsor_tagline, is_active)
SELECT 
  id,
  'Prompt and Go',
  'https://pbmtnvxywplgpldmlygv.supabase.co/storage/v1/object/public/article-images/promptandgo-logo.png',
  'https://www.promptandgo.ai',
  'Your AI prompt companion',
  true
FROM public.categories
WHERE slug = 'create'
LIMIT 1;