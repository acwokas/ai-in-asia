
-- Create analytics_sessions table to track user sessions
CREATE TABLE public.analytics_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  referrer TEXT,
  referrer_domain TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  country TEXT,
  city TEXT,
  landing_page TEXT,
  exit_page TEXT,
  page_count INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create analytics_pageviews table to track individual page views
CREATE TABLE public.analytics_pageviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer_path TEXT,
  time_on_page_seconds INTEGER,
  scroll_depth_percent INTEGER,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  article_id UUID REFERENCES public.articles(id),
  guide_id UUID REFERENCES public.ai_guides(id),
  category_slug TEXT,
  is_exit BOOLEAN DEFAULT false
);

-- Create analytics_events table for custom events
CREATE TABLE public.analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  event_category TEXT,
  event_data JSONB DEFAULT '{}'::jsonb,
  page_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS policies - allow inserts from anyone (anonymous tracking), only admins can read
CREATE POLICY "Anyone can insert analytics sessions" ON public.analytics_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update analytics sessions" ON public.analytics_sessions FOR UPDATE USING (true);
CREATE POLICY "Admins can view analytics sessions" ON public.analytics_sessions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert pageviews" ON public.analytics_pageviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pageviews" ON public.analytics_pageviews FOR UPDATE USING (true);
CREATE POLICY "Admins can view pageviews" ON public.analytics_pageviews FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert events" ON public.analytics_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view events" ON public.analytics_events FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_analytics_sessions_started_at ON public.analytics_sessions(started_at DESC);
CREATE INDEX idx_analytics_sessions_referrer_domain ON public.analytics_sessions(referrer_domain);
CREATE INDEX idx_analytics_pageviews_session_id ON public.analytics_pageviews(session_id);
CREATE INDEX idx_analytics_pageviews_viewed_at ON public.analytics_pageviews(viewed_at DESC);
CREATE INDEX idx_analytics_pageviews_page_path ON public.analytics_pageviews(page_path);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
