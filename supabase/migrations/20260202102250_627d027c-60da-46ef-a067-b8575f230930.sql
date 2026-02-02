-- Create newsletter_link_clicks table to track individual link clicks
CREATE TABLE IF NOT EXISTS public.newsletter_link_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  send_id UUID REFERENCES public.newsletter_sends(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.newsletter_editions(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE SET NULL,
  link_url TEXT NOT NULL,
  link_type TEXT, -- 'article', 'policy_atlas', 'external', 'unsubscribe'
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_hash TEXT,
  session_id TEXT -- Links to analytics_sessions if user continues browsing
);

-- Create newsletter_user_journeys table to track what users do after clicking
CREATE TABLE IF NOT EXISTS public.newsletter_user_journeys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id UUID REFERENCES public.newsletter_link_clicks(id) ON DELETE CASCADE,
  edition_id UUID NOT NULL REFERENCES public.newsletter_editions(id) ON DELETE CASCADE,
  subscriber_id UUID REFERENCES public.newsletter_subscribers(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  landing_page TEXT NOT NULL,
  pages_visited INTEGER DEFAULT 1,
  articles_read UUID[] DEFAULT '{}',
  total_time_seconds INTEGER DEFAULT 0,
  deepest_scroll_depth INTEGER DEFAULT 0,
  converted_to_signup BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add click tracking columns to newsletter_editions for quick stats
ALTER TABLE public.newsletter_editions 
ADD COLUMN IF NOT EXISTS unique_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_clicks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS click_through_rate NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_pages_per_visit NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_time_on_site_seconds INTEGER DEFAULT 0;

-- Enable RLS
ALTER TABLE public.newsletter_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_user_journeys ENABLE ROW LEVEL SECURITY;

-- Allow public inserts for tracking (from edge functions)
CREATE POLICY "Allow insert for tracking" ON public.newsletter_link_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for journey tracking" ON public.newsletter_user_journeys FOR INSERT WITH CHECK (true);

-- Admin read access
CREATE POLICY "Admins can read link clicks" ON public.newsletter_link_clicks 
FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can read journeys" ON public.newsletter_user_journeys 
FOR SELECT USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Allow service role updates for journey data
CREATE POLICY "Allow update for journey tracking" ON public.newsletter_user_journeys FOR UPDATE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_newsletter_link_clicks_edition ON public.newsletter_link_clicks(edition_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_link_clicks_send ON public.newsletter_link_clicks(send_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_link_clicks_article ON public.newsletter_link_clicks(article_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_user_journeys_edition ON public.newsletter_user_journeys(edition_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_user_journeys_session ON public.newsletter_user_journeys(session_id);