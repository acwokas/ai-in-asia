
-- Event ad slots configuration table
CREATE TABLE public.event_ad_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slot_type TEXT NOT NULL CHECK (slot_type IN ('sponsored_featured', 'mid_list_banner', 'sidebar_skyscraper', 'sidebar_square', 'post_filter', 'alerts_sponsor')),
  image_url TEXT,
  click_url TEXT,
  alt_text TEXT DEFAULT '',
  sponsor_name TEXT,
  sponsor_logo_url TEXT,
  position_index INTEGER DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE,
  end_date DATE,
  impression_count INTEGER NOT NULL DEFAULT 0,
  click_count INTEGER NOT NULL DEFAULT 0,
  filter_region TEXT,
  filter_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_ad_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active event ad slots"
  ON public.event_ad_slots FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage event ad slots"
  ON public.event_ad_slots FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add is_sponsored to events table if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='is_sponsored') THEN
    ALTER TABLE public.events ADD COLUMN is_sponsored BOOLEAN DEFAULT false;
  END IF;
END $$;
