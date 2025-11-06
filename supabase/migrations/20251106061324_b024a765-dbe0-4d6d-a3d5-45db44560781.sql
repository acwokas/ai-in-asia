-- Add new article_type for policy articles
ALTER TYPE article_type_new ADD VALUE IF NOT EXISTS 'policy_article';

-- Add new columns to articles table for policy article functionality
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS governance_maturity text CHECK (governance_maturity IN ('binding_law', 'legislative_draft', 'voluntary_framework', 'emerging')),
ADD COLUMN IF NOT EXISTS policy_sections jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS comparison_tables jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS local_resources jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS topic_tags text[];

-- Create indexes for filtering (without WHERE clause to avoid enum issue)
CREATE INDEX IF NOT EXISTS idx_articles_region ON articles(region);
CREATE INDEX IF NOT EXISTS idx_articles_country ON articles(country);
CREATE INDEX IF NOT EXISTS idx_articles_governance_maturity ON articles(governance_maturity);

-- Insert predefined regions as categories
INSERT INTO categories (name, slug, description, display_order, parent_id)
VALUES 
  ('North Asia', 'north-asia', 'AI policy coverage for North Asian countries including Japan, South Korea, and Mongolia', 1, NULL),
  ('ASEAN', 'asean', 'AI governance across Southeast Asian nations', 2, NULL),
  ('Oceania', 'oceania', 'AI regulation in Australia, New Zealand, and Pacific Islands', 3, NULL),
  ('Greater China', 'greater-china', 'AI policy in mainland China, Hong Kong, and Taiwan', 4, NULL),
  ('Anglosphere', 'anglosphere', 'English-speaking nations AI governance', 5, NULL),
  ('Europe', 'europe', 'European Union and national AI regulations', 6, NULL),
  ('MENA', 'mena', 'Middle East and North Africa AI policy landscape', 7, NULL),
  ('Africa', 'africa', 'AI governance across African nations', 8, NULL),
  ('Latin America', 'latin-america', 'AI regulation in Central and South America', 9, NULL),
  ('South Asia', 'south-asia', 'AI policy in India, Pakistan, Bangladesh, and neighboring countries', 10, NULL),
  ('Pan-Pacific', 'pan-pacific', 'Cross-Pacific AI cooperation and standards', 11, NULL),
  ('Pan-Asia', 'pan-asia', 'Asia-wide AI governance initiatives', 12, NULL),
  ('Global Comparison', 'global-comparison', 'Cross-regional AI policy analysis and comparisons', 13, NULL)
ON CONFLICT (slug) DO NOTHING;

-- Insert topic tags as predefined tags
INSERT INTO tags (name, slug, description)
VALUES
  ('Privacy', 'privacy', 'AI privacy regulations and data protection'),
  ('Safety', 'safety', 'AI safety standards and risk management'),
  ('Accountability', 'accountability', 'AI accountability frameworks and governance'),
  ('Fairness', 'fairness', 'AI fairness, bias prevention, and equity'),
  ('Transparency', 'transparency', 'AI transparency and explainability requirements'),
  ('Risk', 'risk', 'AI risk assessment and mitigation'),
  ('Law', 'law', 'AI legal frameworks and legislation'),
  ('Ethics', 'ethics', 'AI ethical guidelines and principles'),
  ('Regulation', 'regulation', 'AI regulatory frameworks and compliance')
ON CONFLICT (slug) DO NOTHING;