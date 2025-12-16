-- Recreate views with SECURITY INVOKER to respect RLS of querying user
DROP VIEW IF EXISTS comments_public;
DROP VIEW IF EXISTS guide_comments_public;

-- Create comments view with SECURITY INVOKER
CREATE VIEW comments_public WITH (security_invoker = true) AS
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

-- Create guide_comments view with SECURITY INVOKER  
CREATE VIEW guide_comments_public WITH (security_invoker = true) AS
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