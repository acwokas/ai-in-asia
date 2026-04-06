-- Create affiliate_links table
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name text NOT NULL,
  keywords text[] NOT NULL,
  affiliate_url text NOT NULL,
  commission_info text,
  programme text,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for keyword searches
CREATE INDEX IF NOT EXISTS idx_affiliate_links_keywords ON public.affiliate_links USING GIN (keywords);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_affiliate_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_affiliate_links_updated_at
  BEFORE UPDATE ON public.affiliate_links
  FOR EACH ROW EXECUTE FUNCTION update_affiliate_links_updated_at();

-- Seed data
INSERT INTO public.affiliate_links (product_name, keywords, affiliate_url, commission_info, programme, category) VALUES
  ('Jasper AI', ARRAY['jasper', 'jasper ai', 'jasper.ai'], 'https://www.jasper.ai/?via=aiinasia', '30% recurring', 'FirstPromoter', 'AI Writing'),
  ('Coursera', ARRAY['coursera', 'coursera course', 'online course'], 'https://www.coursera.org/?via=aiinasia', '15-45%', 'Impact', 'Education'),
  ('NordVPN', ARRAY['nordvpn', 'nord vpn', 'vpn'], 'https://nordvpn.com/?via=aiinasia', '40-100% + 30% renewal', 'NordVPN Direct', 'VPN/Security'),
  ('DigitalOcean', ARRAY['digitalocean', 'digital ocean'], 'https://www.digitalocean.com/?via=aiinasia', '$200 per referral', 'Impact/CJ', 'Cloud'),
  ('Copy.ai', ARRAY['copy.ai', 'copyai', 'copy ai'], 'https://www.copy.ai/?via=aiinasia', '20-30% recurring', NULL, 'AI Writing'),
  ('Grammarly', ARRAY['grammarly'], 'https://www.grammarly.com/?via=aiinasia', '$0.20 free / $20 premium', 'Impact', 'AI Writing'),
  ('Surfshark', ARRAY['surfshark', 'surfshark vpn'], 'https://surfshark.com/?via=aiinasia', '40% + recurring', NULL, 'VPN/Security'),
  ('Amazon', ARRAY['amazon'], 'https://www.amazon.com/?tag=aiinasia', '1-10%', 'Amazon Associates', 'General');

-- RPC function to match affiliate links against article text
CREATE OR REPLACE FUNCTION match_affiliate_links(article_text text)
RETURNS TABLE(product_name text, affiliate_url text, matched_keyword text)
AS $$
BEGIN
  RETURN QUERY
  SELECT al.product_name, al.affiliate_url, k as matched_keyword
  FROM public.affiliate_links al, unnest(al.keywords) k
  WHERE al.is_active = true
  AND lower(article_text) LIKE '%' || lower(k) || '%'
  GROUP BY al.product_name, al.affiliate_url, k;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.affiliate_links
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read active links" ON public.affiliate_links
  FOR SELECT USING (is_active = true);