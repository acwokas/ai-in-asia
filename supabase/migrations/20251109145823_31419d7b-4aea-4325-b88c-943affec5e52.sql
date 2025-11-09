-- Create trigger function to automatically add/remove articles from Voices category
CREATE OR REPLACE FUNCTION manage_voices_category()
RETURNS TRIGGER AS $$
DECLARE
  voices_category_id uuid;
  author_name_val text;
BEGIN
  -- Get Voices category ID
  SELECT id INTO voices_category_id FROM categories WHERE slug = 'voices';
  
  IF voices_category_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get author name
  SELECT name INTO author_name_val FROM authors WHERE id = NEW.author_id;
  
  -- If article is published and has an author other than Intelligence Desk
  IF NEW.status = 'published' AND author_name_val IS NOT NULL AND author_name_val != 'Intelligence Desk' THEN
    -- Add to Voices category
    INSERT INTO article_categories (article_id, category_id)
    VALUES (NEW.id, voices_category_id)
    ON CONFLICT (article_id, category_id) DO NOTHING;
  ELSE
    -- Remove from Voices category if conditions not met
    DELETE FROM article_categories
    WHERE article_id = NEW.id AND category_id = voices_category_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on articles table
DROP TRIGGER IF EXISTS trigger_manage_voices_category ON articles;
CREATE TRIGGER trigger_manage_voices_category
  AFTER INSERT OR UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION manage_voices_category();