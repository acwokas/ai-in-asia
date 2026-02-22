
-- Table 1: trusted_sources
CREATE TABLE trusted_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  domain text NOT NULL,
  rss_url text NOT NULL,
  category text DEFAULT 'tech',
  region text DEFAULT 'Global',
  tier integer DEFAULT 3,
  harvest_frequency_hours integer DEFAULT 12,
  is_active boolean DEFAULT true,
  last_harvested_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trusted_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read trusted_sources" ON trusted_sources FOR SELECT USING (true);
CREATE POLICY "Allow service role all trusted_sources" ON trusted_sources FOR ALL USING (auth.role() = 'service_role');

-- Table 2: external_links
CREATE TABLE external_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  source_name text NOT NULL,
  domain text NOT NULL,
  published_at timestamptz,
  category text,
  region text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_external_links_title_search ON external_links USING gin(to_tsvector('english', title));
CREATE INDEX idx_external_links_created ON external_links (created_at DESC);
CREATE INDEX idx_external_links_domain ON external_links (domain);

ALTER TABLE external_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read external_links" ON external_links FOR SELECT USING (true);
CREATE POLICY "Allow service role all external_links" ON external_links FOR ALL USING (auth.role() = 'service_role');

-- Seed trusted_sources
INSERT INTO trusted_sources (name, domain, rss_url, category, region, tier, harvest_frequency_hours) VALUES
('MIT Technology Review - AI', 'technologyreview.com', 'https://www.technologyreview.com/topic/artificial-intelligence/feed', 'ai', 'Global', 1, 6),
('The Decoder', 'the-decoder.com', 'https://the-decoder.com/feed/', 'ai', 'Global', 1, 6),
('VentureBeat AI', 'venturebeat.com', 'https://venturebeat.com/category/ai/feed/', 'ai', 'Global', 1, 6),
('Ars Technica AI', 'arstechnica.com', 'https://arstechnica.com/ai/feed', 'ai', 'Global', 1, 6),
('Wired AI', 'wired.com', 'https://www.wired.com/feed/tag/ai/latest/rss', 'ai', 'Global', 1, 6),
('TechCrunch AI', 'techcrunch.com', 'https://techcrunch.com/category/artificial-intelligence/feed/', 'ai', 'Global', 1, 6),
('The Verge AI', 'theverge.com', 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', 'ai', 'Global', 1, 6),
('Unite.AI', 'unite.ai', 'https://www.unite.ai/feed/', 'ai', 'Global', 1, 6),
('AI News', 'artificialintelligence-news.com', 'https://www.artificialintelligence-news.com/feed/rss/', 'ai', 'Global', 1, 6),
('The Algorithmic Bridge', 'thealgorithmicbridge.substack.com', 'https://thealgorithmicbridge.substack.com/feed', 'ai', 'Global', 1, 6),
('Ahead of AI', 'magazine.sebastianraschka.com', 'https://magazine.sebastianraschka.com/feed', 'ai-research', 'Global', 1, 6),
('Nikkei Asia Tech', 'asia.nikkei.com', 'https://asia.nikkei.com/rss/feed/nar', 'tech', 'Asia', 2, 6),
('SCMP Tech', 'scmp.com', 'https://www.scmp.com/rss/36/feed', 'tech', 'Greater China', 2, 6),
('e27', 'e27.co', 'https://e27.co/index_wp.php/feed', 'startups', 'Southeast Asia', 2, 6),
('Rest of World', 'restofworld.org', 'https://restofworld.org/feed/latest', 'tech', 'Global South', 2, 6),
('The Diplomat', 'thediplomat.com', 'https://thediplomat.com/feed/', 'policy', 'Asia-Pacific', 2, 6),
('Asian Scientist', 'asianscientist.com', 'https://www.asianscientist.com/feed/?x=1', 'science', 'Asia', 2, 6),
('Digital News Asia', 'digitalnewsasia.com', 'https://www.digitalnewsasia.com/rss.xml', 'tech', 'Southeast Asia', 2, 6),
('Tech in Asia', 'techinasia.com', 'https://www.techinasia.com/feed', 'startups', 'Asia', 2, 6),
('KrASIA', 'kr-asia.com', 'https://kr-asia.com/feed', 'tech', 'Asia', 2, 6),
('Campaign Asia', 'campaignasia.com', 'https://www.campaignasia.com/RSS/rssfeed', 'marketing', 'Asia-Pacific', 2, 6),
('Hong Kong Free Press', 'hongkongfp.com', 'https://hongkongfp.com/feed/', 'news', 'Hong Kong', 2, 6),
('TechCrunch', 'techcrunch.com', 'https://techcrunch.com/feed/', 'tech', 'Global', 3, 12),
('The Verge', 'theverge.com', 'https://www.theverge.com/rss/index.xml', 'tech', 'Global', 3, 12),
('Ars Technica', 'arstechnica.com', 'http://feeds.arstechnica.com/arstechnica/index/', 'tech', 'Global', 3, 12),
('Wired', 'wired.com', 'https://www.wired.com/feed/rss', 'tech', 'Global', 3, 12),
('The Register', 'theregister.com', 'https://www.theregister.com/headlines.atom', 'tech', 'Global', 3, 12),
('Techmeme', 'techmeme.com', 'https://www.techmeme.com/feed.xml', 'tech', 'Global', 3, 12),
('The Guardian AI', 'theguardian.com', 'https://www.theguardian.com/technology/artificialintelligenceai/rss', 'ai', 'Global', 3, 12),
('Google AI Blog', 'blog.google', 'https://blog.google/technology/ai/rss/', 'ai-research', 'Global', 4, 12),
('OpenAI Blog', 'openai.com', 'https://openai.com/blog/rss/', 'ai-research', 'Global', 4, 12),
('DeepMind Blog', 'deepmind.com', 'https://deepmind.com/blog/feed/basic/', 'ai-research', 'Global', 4, 12),
('Anthropic Blog', 'anthropic.com', 'https://www.anthropic.com/feed.xml', 'ai-research', 'Global', 4, 12),
('Meta AI Blog', 'ai.meta.com', 'https://ai.meta.com/blog/rss/', 'ai-research', 'Global', 4, 12),
('Microsoft AI Blog', 'blogs.microsoft.com', 'https://blogs.microsoft.com/ai/feed/', 'ai-research', 'Global', 4, 12),
('BAIR Blog', 'bair.berkeley.edu', 'https://bair.berkeley.edu/blog/feed.xml', 'ai-research', 'Global', 4, 12),
('MIT News AI', 'news.mit.edu', 'http://news.mit.edu/rss/topic/artificial-intelligence2', 'ai-research', 'Global', 4, 12),
('Reuters Tech', 'reutersagency.com', 'https://www.reutersagency.com/feed/?best-topics=tech', 'business', 'Global', 5, 24),
('Bloomberg Tech', 'bloomberg.com', 'https://feeds.bloomberg.com/technology/news.rss', 'business', 'Global', 5, 24),
('The Economist', 'economist.com', 'https://www.economist.com/latest/rss.xml', 'business', 'Global', 5, 24),
('Harvard Business Review', 'hbr.org', 'https://hbr.org/topic/technology/feed', 'business', 'Global', 5, 24),
('Brookings AI', 'brookings.edu', 'https://www.brookings.edu/topic/artificial-intelligence/feed/', 'policy', 'Global', 5, 24),
('404 Media', '404media.co', 'https://www.404media.co/rss', 'tech', 'Global', 6, 24),
('Tech Monitor', 'techmonitor.ai', 'https://techmonitor.ai/feed', 'enterprise', 'Global', 6, 24),
('AI Snake Oil', 'aisnakeoil.substack.com', 'https://aisnakeoil.substack.com/feed', 'ai-criticism', 'Global', 6, 24),
('Science Daily AI', 'sciencedaily.com', 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', 'ai-research', 'Global', 6, 24);
