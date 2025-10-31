-- Create a function to increment article view count
-- This is a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION increment_article_views(UUID) TO anon, authenticated;