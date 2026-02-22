
-- Articles table: core lookup indexes
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_primary_category_id ON articles(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_featured_on_homepage ON articles(featured_on_homepage) WHERE featured_on_homepage = true;

-- Composite indexes for the most common query patterns
CREATE INDEX IF NOT EXISTS idx_articles_status_published_at ON articles(status, published_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_articles_status_slug ON articles(status, slug);
CREATE INDEX IF NOT EXISTS idx_articles_category_status ON articles(primary_category_id, status, published_at DESC NULLS LAST);

-- Comments table
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON comments(article_id, approved);
CREATE INDEX IF NOT EXISTS idx_ai_comments_published ON ai_generated_comments(article_id, published);

-- Bookmarks and reading history (queried per user per article)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_article ON bookmarks(user_id, article_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_article ON reading_history(user_id, article_id);

-- User stats (queried on every page for logged-in users)
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
