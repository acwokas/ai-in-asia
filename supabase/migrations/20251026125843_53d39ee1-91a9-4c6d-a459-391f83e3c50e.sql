-- ============================================
-- STEP 6: CREATE NEWSLETTER TABLES
-- ============================================

-- Newsletter Subscribers
CREATE TABLE public.newsletter_subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  confirmed BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  points_earned INTEGER DEFAULT 0,
  total_opens INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMPTZ
);

-- Newsletter Editions
CREATE TABLE public.newsletter_editions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_date DATE NOT NULL,
  subject_line TEXT NOT NULL,
  subject_line_variant_b TEXT,
  status newsletter_status NOT NULL DEFAULT 'draft',
  
  -- Content
  hero_article_id UUID REFERENCES public.articles(id),
  hero_article_original UUID,
  hero_article_manual_override BOOLEAN DEFAULT false,
  editor_note TEXT,
  mini_case_study TEXT,
  meme_image_url TEXT,
  meme_caption TEXT,
  meme_alt_text TEXT,
  comments_count_override INTEGER,
  
  -- Sending
  scheduled_send_time TIMESTAMPTZ,
  send_timezone TEXT NOT NULL DEFAULT 'Asia/Singapore',
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  
  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Newsletter Top Stories
CREATE TABLE public.newsletter_top_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES public.newsletter_editions(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  original_article_id UUID,
  position INTEGER NOT NULL,
  manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newsletter Quick Takes
CREATE TABLE public.newsletter_quick_takes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID REFERENCES public.newsletter_editions(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  insight TEXT NOT NULL,
  source_url TEXT,
  display_order INTEGER,
  manually_selected BOOLEAN DEFAULT false,
  scraped_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newsletter Sends (Tracking)
CREATE TABLE public.newsletter_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  edition_id UUID NOT NULL REFERENCES public.newsletter_editions(id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES public.newsletter_subscribers(id) ON DELETE CASCADE,
  variant TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  clicked_sections JSONB DEFAULT '[]'::jsonb,
  bounced BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMPTZ
);

-- Newsletter Sponsors
CREATE TABLE public.newsletter_sponsors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  logo_url TEXT,
  banner_image_url TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  is_collective_site BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newsletter Tools & Prompts
CREATE TABLE public.newsletter_tools_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category tool_prompt_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT NOT NULL,
  featured_image_url TEXT,
  source TEXT DEFAULT 'PromptandGo',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newsletter Mystery Links
CREATE TABLE public.newsletter_mystery_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  category TEXT,
  used_in_editions UUID[] DEFAULT ARRAY[]::UUID[],
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '60 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

-- Newsletter Fun Facts
CREATE TABLE public.newsletter_fun_facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fact_text TEXT NOT NULL,
  source TEXT,
  is_active BOOLEAN DEFAULT true,
  used_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newsletter News Sources
CREATE TABLE public.newsletter_news_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  rss_feed_url TEXT,
  region TEXT DEFAULT 'APAC',
  is_active BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Newsletter Automation Log
CREATE TABLE public.newsletter_automation_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_top_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_quick_takes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_tools_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_mystery_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_fun_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_news_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_automation_log ENABLE ROW LEVEL SECURITY;