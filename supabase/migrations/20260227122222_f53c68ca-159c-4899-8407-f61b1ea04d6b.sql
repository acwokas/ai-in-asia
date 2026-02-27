CREATE OR REPLACE FUNCTION public.rotate_trending_articles()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  cat_record RECORD;
  cat_trending_count INTEGER;
BEGIN
  -- A) Calculate trending_score for ALL published articles
  -- Formula: recency_base + editorial_boost + view_boost
  -- recency_base = 100 - (days_since_published * 2)
  -- editorial_boost = +20 if trending, +30 if featured
  -- view_boost = LEAST(view_count / 10, 50) - capped at 50 points
  UPDATE articles
  SET trending_score = GREATEST(
    0,
    (100 - (EXTRACT(EPOCH FROM (NOW() - COALESCE(published_at, created_at))) / 86400.0 * 2))
    + CASE WHEN is_trending = TRUE THEN 20 ELSE 0 END
    + CASE WHEN featured_on_homepage = TRUE THEN 30 ELSE 0 END
    + LEAST(COALESCE(view_count, 0) / 10.0, 50)
  )
  WHERE status = 'published';

  -- Set score to 0 for non-published
  UPDATE articles SET trending_score = 0 WHERE status != 'published';

  -- B) Clear trending on non-pinned articles
  UPDATE articles
  SET is_trending = FALSE, trending_rotated_at = NOW()
  WHERE is_trending = TRUE AND (featured_pinned IS NOT TRUE);

  -- C) Set trending on top 6 globally (last 90 days)
  UPDATE articles
  SET is_trending = TRUE, trending_rotated_at = NOW()
  WHERE id IN (
    SELECT id FROM articles
    WHERE status = 'published'
      AND published_at >= NOW() - INTERVAL '90 days'
    ORDER BY trending_score DESC
    LIMIT 6
  );

  -- D) Per category: top 4 by score within 90 days
  FOR cat_record IN
    SELECT DISTINCT primary_category_id FROM articles
    WHERE primary_category_id IS NOT NULL AND status = 'published'
  LOOP
    UPDATE articles
    SET is_trending = TRUE, trending_rotated_at = NOW()
    WHERE id IN (
      SELECT id FROM articles
      WHERE status = 'published'
        AND primary_category_id = cat_record.primary_category_id
        AND published_at >= NOW() - INTERVAL '90 days'
      ORDER BY trending_score DESC
      LIMIT 4
    );

    -- Check if category has at least 2 trending
    SELECT COUNT(*) INTO cat_trending_count
    FROM articles
    WHERE primary_category_id = cat_record.primary_category_id
      AND is_trending = TRUE
      AND status = 'published';

    IF cat_trending_count < 2 THEN
      UPDATE articles
      SET is_trending = TRUE, trending_rotated_at = NOW()
      WHERE id IN (
        SELECT id FROM articles
        WHERE status = 'published'
          AND primary_category_id = cat_record.primary_category_id
          AND is_trending IS NOT TRUE
        ORDER BY trending_score DESC
        LIMIT (2 - cat_trending_count)
      );
    END IF;
  END LOOP;
END;
$$;