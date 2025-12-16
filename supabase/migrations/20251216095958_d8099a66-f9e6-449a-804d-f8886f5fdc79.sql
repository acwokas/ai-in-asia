-- Create a public view for comments that excludes the author_email column
CREATE OR REPLACE VIEW comments_public AS
SELECT 
  id,
  article_id,
  user_id,
  parent_id,
  content,
  author_name,
  approved,
  created_at
FROM comments
WHERE approved = true;

-- Grant access to the view
GRANT SELECT ON comments_public TO anon, authenticated;

-- Create a public view for guide_comments that excludes the author_email column
CREATE OR REPLACE VIEW guide_comments_public AS
SELECT 
  id,
  guide_id,
  user_id,
  parent_id,
  content,
  author_name,
  approved,
  created_at
FROM guide_comments
WHERE approved = true;

-- Grant access to the view
GRANT SELECT ON guide_comments_public TO anon, authenticated;