-- Create guide_comments table for AI Guides comments
CREATE TABLE public.guide_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guide_id UUID NOT NULL REFERENCES public.ai_guides(id) ON DELETE CASCADE,
  user_id UUID,
  parent_id UUID REFERENCES public.guide_comments(id),
  content TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.guide_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view approved guide comments" 
ON public.guide_comments 
FOR SELECT 
USING (approved = true);

CREATE POLICY "Authenticated users can create guide comments" 
ON public.guide_comments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update their own guide comments" 
ON public.guide_comments 
FOR UPDATE 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all guide comments" 
ON public.guide_comments 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));