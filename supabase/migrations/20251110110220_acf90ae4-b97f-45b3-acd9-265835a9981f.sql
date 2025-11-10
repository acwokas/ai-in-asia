-- Add homepage_trending column to articles table for global trending list
ALTER TABLE articles 
ADD COLUMN homepage_trending boolean DEFAULT false;

-- Add index for better query performance
CREATE INDEX idx_articles_homepage_trending ON articles(homepage_trending) WHERE homepage_trending = true;

-- Add comment for clarity
COMMENT ON COLUMN articles.homepage_trending IS 'Controls whether article appears in the global trending list on homepage';
COMMENT ON COLUMN articles.is_trending IS 'Controls whether article appears in category-specific trending boxes';