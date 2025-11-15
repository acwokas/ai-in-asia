-- Fix function search path security issue
DROP FUNCTION IF EXISTS update_reading_streak(UUID);

CREATE OR REPLACE FUNCTION update_reading_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_last_read_date DATE;
  v_streak_start DATE;
BEGIN
  -- Get current streak data
  SELECT current_streak, longest_streak, last_read_date, streak_start_date
  INTO v_current_streak, v_longest_streak, v_last_read_date, v_streak_start
  FROM reading_streaks
  WHERE user_id = p_user_id;

  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO reading_streaks (user_id, current_streak, longest_streak, last_read_date, streak_start_date, total_articles_read)
    VALUES (p_user_id, 1, 1, v_today, v_today, 1);
    RETURN;
  END IF;

  -- If already read today, just increment article count
  IF v_last_read_date = v_today THEN
    UPDATE reading_streaks
    SET total_articles_read = total_articles_read + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    RETURN;
  END IF;

  -- If read yesterday, increment streak
  IF v_last_read_date = v_yesterday THEN
    v_current_streak := v_current_streak + 1;
    
    -- Update longest streak if current is higher
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;

    UPDATE reading_streaks
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_read_date = v_today,
        total_articles_read = total_articles_read + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken, restart
    UPDATE reading_streaks
    SET current_streak = 1,
        last_read_date = v_today,
        streak_start_date = v_today,
        total_articles_read = total_articles_read + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;