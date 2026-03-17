
-- Create social_posts table
CREATE TABLE public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  article_slug text NOT NULL,
  platform text NOT NULL,
  publer_post_id text,
  publer_media_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'published', 'failed')),
  scheduled_for timestamptz,
  posted_at timestamptz,
  error_message text,
  post_copy text,
  media_url text,
  publer_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_social_posts_article_id ON public.social_posts (article_id);
CREATE INDEX idx_social_posts_article_slug ON public.social_posts (article_slug);
CREATE INDEX idx_social_posts_platform ON public.social_posts (platform);
CREATE INDEX idx_social_posts_status ON public.social_posts (status);
CREATE INDEX idx_social_posts_scheduled_for ON public.social_posts (scheduled_for) WHERE status = 'scheduled';

-- Enable RLS
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

-- Service role bypass policy
CREATE POLICY "Service role full access on social_posts"
  ON public.social_posts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin read access
CREATE POLICY "Admins can view social_posts"
  ON public.social_posts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
