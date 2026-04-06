
-- Partners table for logo showcase
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('founding', 'premium', 'standard')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Anyone can view active partners (public page)
CREATE POLICY "Anyone can view active partners"
  ON public.partners FOR SELECT
  USING (is_active = true);

-- Only admins can manage partners
CREATE POLICY "Admins can manage partners"
  ON public.partners FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Partnership inquiries table
CREATE TABLE public.partnership_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  role TEXT,
  partnership_type TEXT NOT NULL CHECK (partnership_type IN ('editorial_sponsorship', 'event_partnership', 'research_collaboration', 'brand_integration')),
  message TEXT,
  budget_range TEXT CHECK (budget_range IN ('under_5k', '5k_15k', '15k_50k', '50k_plus', 'discuss', NULL)),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'in_progress', 'closed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partnership_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit inquiries (public form)
CREATE POLICY "Anyone can submit partnership inquiries"
  ON public.partnership_inquiries FOR INSERT
  WITH CHECK (true);

-- Only admins can view/manage inquiries
CREATE POLICY "Admins can manage partnership inquiries"
  ON public.partnership_inquiries FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
