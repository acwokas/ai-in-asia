
-- Disable the trigger temporarily
ALTER TABLE articles DISABLE TRIGGER update_articles_updated_at;

-- Restore updated_at to published_at for articles not genuinely edited today
UPDATE articles
SET updated_at = COALESCE(published_at, created_at)
WHERE updated_at::date = '2026-04-04'
  AND (published_at IS NULL OR published_at::date != '2026-04-04');

-- Re-enable the trigger
ALTER TABLE articles ENABLE TRIGGER update_articles_updated_at;
