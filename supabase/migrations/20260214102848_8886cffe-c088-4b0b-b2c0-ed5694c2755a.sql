
-- Fix 1: increment_article_views - validate article exists and is published
CREATE OR REPLACE FUNCTION public.increment_article_views(article_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE articles
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = article_id AND status = 'published';
END;
$function$;

-- Fix 2: update_reading_streak - validate caller is updating their own streak
CREATE OR REPLACE FUNCTION public.update_reading_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_read_date DATE;
  v_streak_start DATE;
BEGIN
  -- Validate caller is updating their own streak
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Cannot update another user''s reading streak';
  END IF;

  SELECT current_streak, longest_streak, last_read_date, streak_start_date
  INTO v_current_streak, v_longest_streak, v_last_read_date, v_streak_start
  FROM reading_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO reading_streaks (user_id, current_streak, longest_streak, last_read_date, streak_start_date, total_articles_read)
    VALUES (p_user_id, 1, 1, v_today, v_today, 1);
    RETURN;
  END IF;

  IF v_last_read_date = v_today THEN
    UPDATE reading_streaks
    SET total_articles_read = total_articles_read + 1, updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  IF v_last_read_date = v_yesterday THEN
    v_current_streak := v_current_streak + 1;
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    UPDATE reading_streaks
    SET current_streak = v_current_streak, longest_streak = v_longest_streak,
        last_read_date = v_today, total_articles_read = total_articles_read + 1, updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE reading_streaks
    SET current_streak = 1, last_read_date = v_today, streak_start_date = v_today,
        total_articles_read = total_articles_read + 1, updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$function$;

-- Fix 3: Tighten analytics RLS policies

-- analytics_sessions: restrict INSERT
DROP POLICY IF EXISTS "Anyone can insert analytics sessions" ON public.analytics_sessions;
CREATE POLICY "Users can insert own sessions"
  ON public.analytics_sessions FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- analytics_sessions: restrict UPDATE to own records within 24h
DROP POLICY IF EXISTS "Anyone can update analytics sessions" ON public.analytics_sessions;
CREATE POLICY "Users can update own sessions"
  ON public.analytics_sessions FOR UPDATE
  USING (
    (user_id IS NULL AND created_at > now() - interval '24 hours')
    OR user_id = auth.uid()
  );

-- analytics_pageviews: restrict INSERT
DROP POLICY IF EXISTS "Allow public insert on analytics_pageviews" ON public.analytics_pageviews;
CREATE POLICY "Users can insert own pageviews"
  ON public.analytics_pageviews FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- analytics_pageviews: restrict UPDATE
DROP POLICY IF EXISTS "Allow public update on analytics_pageviews" ON public.analytics_pageviews;
CREATE POLICY "Users can update own pageviews"
  ON public.analytics_pageviews FOR UPDATE
  USING (
    (user_id IS NULL AND viewed_at > now() - interval '24 hours')
    OR user_id = auth.uid()
  );

-- analytics_events: restrict INSERT
DROP POLICY IF EXISTS "Allow public insert on analytics_events" ON public.analytics_events;
CREATE POLICY "Users can insert own events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
