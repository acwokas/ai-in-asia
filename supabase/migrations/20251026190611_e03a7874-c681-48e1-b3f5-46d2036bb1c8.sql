-- Update category slugs to be lowercase for URL consistency
UPDATE categories 
SET slug = lower(slug)
WHERE slug IN ('Create', 'Learn', 'Voices', 'Life');

-- Also update the article_categories to ensure consistency
-- (No changes needed as it references by ID)