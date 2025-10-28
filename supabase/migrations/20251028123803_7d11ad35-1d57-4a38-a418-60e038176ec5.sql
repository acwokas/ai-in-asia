-- Update Business category description
UPDATE categories 
SET description = 'Navigate the high-level investments, strategic decisions, and enterprise disruptions reshaping the region. Find the insights, data trends, and executive playbooks needed to scale AI and drive growth across Asia.'
WHERE slug = 'business';

-- Insert BusinessInAByte as sponsor for Business category
INSERT INTO category_sponsors (category_id, sponsor_name, sponsor_logo_url, sponsor_website_url, sponsor_tagline, is_active)
VALUES (
  '76a8b07d-79df-40fb-b605-a674c40da906',
  'Business in a Byte',
  '/logos/businessinabyte-logo.png',
  'https://www.businessinabyte.com',
  'Free tools and playbooks. Built for entrepreneurs who move fast.',
  true
);