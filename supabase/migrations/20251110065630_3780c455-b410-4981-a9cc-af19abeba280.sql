-- Create AI comment authors table
CREATE TABLE public.ai_comment_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  handle text NOT NULL UNIQUE,
  avatar_url text,
  region text NOT NULL CHECK (region IN ('singapore', 'india', 'philippines', 'china_hk', 'west')),
  is_power_user boolean DEFAULT false,
  comment_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create AI generated comments table
CREATE TABLE public.ai_generated_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.ai_comment_authors(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  comment_date timestamp with time zone NOT NULL,
  is_ai boolean DEFAULT true,
  UNIQUE(article_id, author_id, comment_date)
);

-- Enable RLS
ALTER TABLE public.ai_comment_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_comment_authors
CREATE POLICY "Anyone can view AI comment authors"
  ON public.ai_comment_authors
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage AI comment authors"
  ON public.ai_comment_authors
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ai_generated_comments
CREATE POLICY "Anyone can view AI generated comments"
  ON public.ai_generated_comments
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage AI generated comments"
  ON public.ai_generated_comments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_ai_comments_article ON public.ai_generated_comments(article_id);
CREATE INDEX idx_ai_comments_date ON public.ai_generated_comments(comment_date);
CREATE INDEX idx_ai_authors_region ON public.ai_comment_authors(region);
CREATE INDEX idx_ai_authors_power_user ON public.ai_comment_authors(is_power_user);