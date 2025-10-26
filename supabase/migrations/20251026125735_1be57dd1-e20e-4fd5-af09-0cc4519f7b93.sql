-- ============================================
-- STEP 3: CREATE MAIN CONTENT TABLES
-- ============================================

-- Articles Table (Main content)
CREATE TABLE public.articles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  status article_status NOT NULL DEFAULT 'draft',
  article_type article_type_new NOT NULL DEFAULT 'article',
  
  -- Author & Categories
  author_id UUID REFERENCES public.authors(id),
  primary_category_id UUID REFERENCES public.categories(id),
  
  -- Featured Image
  featured_image_url TEXT,
  featured_image_alt TEXT,
  featured_image_caption TEXT,
  featured_image_credit TEXT,
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  seo_title TEXT,
  focus_keyphrase TEXT,
  keyphrase_synonyms TEXT,
  canonical_url TEXT,
  
  -- Flags
  featured_on_homepage BOOLEAN DEFAULT false,
  sticky BOOLEAN DEFAULT false,
  cornerstone BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  is_launch_article BOOLEAN DEFAULT false,
  
  -- Stats
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  reading_time_minutes INTEGER,
  
  -- AI Features
  ai_summary TEXT,
  ai_tags TEXT[],
  ai_generated_at TIMESTAMPTZ,
  tldr_snapshot JSONB DEFAULT '[]'::jsonb,
  
  -- Series
  series_id UUID REFERENCES public.article_series(id),
  series_part INTEGER,
  series_total INTEGER,
  
  -- Publishing
  published_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,
  
  -- Article Type Specific Fields
  event_date DATE,
  event_start_date TIMESTAMPTZ,
  event_end_date TIMESTAMPTZ,
  event_location TEXT,
  event_venue TEXT,
  event_registration_url TEXT,
  podcast_audio_url TEXT,
  podcast_duration_minutes INTEGER,
  review_product_name TEXT,
  review_rating NUMERIC,
  
  -- System
  version INTEGER DEFAULT 1,
  batch_id UUID,
  preview_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Events Table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  
  -- Event Details
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  location TEXT NOT NULL,
  venue TEXT,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'APAC',
  
  -- Links
  website_url TEXT,
  registration_url TEXT,
  
  -- Metadata
  event_type TEXT NOT NULL DEFAULT 'conference',
  organizer TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  is_featured BOOLEAN DEFAULT false,
  
  -- System
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;