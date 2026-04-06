
-- Create ai_companies table
CREATE TABLE public.ai_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  long_description TEXT,
  logo_url TEXT,
  website_url TEXT,
  country TEXT NOT NULL,
  city TEXT,
  category TEXT[] DEFAULT '{}',
  subcategories TEXT[],
  founded_year INTEGER,
  funding_stage TEXT,
  funding_total TEXT,
  employee_count_range TEXT,
  key_people JSONB DEFAULT '[]',
  social_links JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_ai_companies_country ON public.ai_companies(country);
CREATE INDEX idx_ai_companies_category ON public.ai_companies USING GIN(category);
CREATE INDEX idx_ai_companies_slug ON public.ai_companies(slug);
CREATE INDEX idx_ai_companies_founded_year ON public.ai_companies(founded_year);

-- Create company_submissions table
CREATE TABLE public.company_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  website TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  description TEXT,
  country TEXT NOT NULL,
  category TEXT[] DEFAULT '{}',
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.ai_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Everyone can read companies
CREATE POLICY "Anyone can view companies" ON public.ai_companies
  FOR SELECT USING (true);

-- RLS: Only admins can modify companies
CREATE POLICY "Admins can manage companies" ON public.ai_companies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Anyone can submit a company
CREATE POLICY "Anyone can submit a company" ON public.company_submissions
  FOR INSERT WITH CHECK (true);

-- RLS: Only admins can view and manage submissions
CREATE POLICY "Admins can manage submissions" ON public.company_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_ai_companies_updated_at
  BEFORE UPDATE ON public.ai_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
