-- Update all "Adrian's Arena" articles to "Adrian's Angle" (titles only, not slugs)
-- and set author to Adrian Watkins
UPDATE articles 
SET 
  title = REPLACE(title, 'Adrian''s Arena', 'Adrian''s Angle'),
  author_id = '29b39a13-0aa1-492f-9b47-a153e036a91a'
WHERE title ILIKE '%Adrian''s Arena%';