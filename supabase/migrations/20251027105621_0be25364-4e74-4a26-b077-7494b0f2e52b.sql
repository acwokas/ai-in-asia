
-- Fix article slugs with URL-encoded characters
-- Replace %e2%80%91 (non-breaking hyphen) with regular hyphens

UPDATE articles 
SET slug = 'gpt5-gdpval-openai-benchmark'
WHERE id = '37f74195-2e83-410c-8a71-be1b88fb1288';

UPDATE articles 
SET slug = 'ai-with-empathy-designing-machines'
WHERE id = 'efe16b70-9af3-470d-8cdd-6a16aacbe042';

UPDATE articles 
SET slug = 'non-machine-premium-future-work'
WHERE id = '29797575-5301-4f2e-85af-925c06f123e0';

UPDATE articles 
SET slug = 'meta-ai-talent-drain-and-billion-dollar-revival'
WHERE id = '98898ca4-598c-4bbf-ba94-232f4b0a2f5a';

-- Create redirects for the old URLs to the new clean URLs
INSERT INTO redirects (from_path, to_path, status_code, created_by)
VALUES 
  ('/create/gpt5%e2%80%91gdpval%e2%80%91openai%e2%80%91benchmark', '/create/gpt5-gdpval-openai-benchmark', 301, (SELECT id FROM auth.users LIMIT 1)),
  ('/create/ai-with-empathy-designing%e2%80%91machines', '/create/ai-with-empathy-designing-machines', 301, (SELECT id FROM auth.users LIMIT 1)),
  ('/voices/non%e2%80%91machine%e2%80%91premium%e2%80%91future%e2%80%91work', '/voices/non-machine-premium-future-work', 301, (SELECT id FROM auth.users LIMIT 1)),
  ('/business/meta-ai-talent-drain-and-billion%e2%80%91dollar-revival', '/business/meta-ai-talent-drain-and-billion-dollar-revival', 301, (SELECT id FROM auth.users LIMIT 1))
ON CONFLICT (from_path) DO NOTHING;
