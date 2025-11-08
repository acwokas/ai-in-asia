-- Function to automatically manage Voices category for articles
CREATE OR REPLACE FUNCTION public.manage_voices_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  voices_category_id uuid;
  author_name_val text;
BEGIN
  -- Get Voices category ID
  SELECT id INTO voices_category_id FROM public.categories WHERE slug = 'voices';
  
  -- Get author name
  SELECT name INTO author_name_val FROM public.authors WHERE id = NEW.author_id;
  
  -- Only proceed if article is published and has an author other than Intelligence Desk
  IF NEW.status = 'published' AND author_name_val IS NOT NULL AND author_name_val != 'Intelligence Desk' THEN
    -- Add to Voices category if not already there
    INSERT INTO public.article_categories (article_id, category_id)
    VALUES (NEW.id, voices_category_id)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.status != 'published' OR author_name_val = 'Intelligence Desk' OR author_name_val IS NULL THEN
    -- Remove from Voices category if conditions no longer met
    DELETE FROM public.article_categories
    WHERE article_id = NEW.id AND category_id = voices_category_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new and updated articles
DROP TRIGGER IF EXISTS manage_voices_category_trigger ON public.articles;
CREATE TRIGGER manage_voices_category_trigger
AFTER INSERT OR UPDATE OF status, author_id
ON public.articles
FOR EACH ROW
EXECUTE FUNCTION public.manage_voices_category();

-- One-time update: Add all existing published articles by non-Intelligence Desk authors to Voices
INSERT INTO public.article_categories (article_id, category_id)
SELECT a.id, c.id
FROM public.articles a
CROSS JOIN public.categories c
LEFT JOIN public.authors auth ON a.author_id = auth.id
WHERE c.slug = 'voices'
  AND a.status = 'published'
  AND auth.name IS NOT NULL
  AND auth.name != 'Intelligence Desk'
  AND NOT EXISTS (
    SELECT 1 FROM public.article_categories ac
    WHERE ac.article_id = a.id AND ac.category_id = c.id
  );