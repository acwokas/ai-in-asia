-- ============================================
-- DATABASE FUNCTIONS (Part 2 - Gamification)
-- ============================================

-- Award Points
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _points integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points integer;
  new_level text;
BEGIN
  -- Add points
  UPDATE public.user_stats
  SET points = points + _points,
      updated_at = now()
  WHERE user_id = _user_id
  RETURNING points INTO new_points;
  
  -- Update level
  IF new_points >= 1000 THEN
    new_level := 'thought_leader';
  ELSIF new_points >= 500 THEN
    new_level := 'expert';
  ELSIF new_points >= 100 THEN
    new_level := 'enthusiast';
  ELSE
    new_level := 'explorer';
  END IF;
  
  UPDATE public.user_stats
  SET level = new_level
  WHERE user_id = _user_id;
END;
$$;

-- Update Streak
CREATE OR REPLACE FUNCTION public.update_streak(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_read date;
  current_streak integer;
BEGIN
  SELECT last_read_date, streak_days INTO last_read, current_streak
  FROM public.user_stats
  WHERE user_id = _user_id;

  IF last_read IS NULL THEN
    -- First read
    UPDATE public.user_stats
    SET last_read_date = CURRENT_DATE,
        streak_days = 1
    WHERE user_id = _user_id;
  ELSIF last_read = CURRENT_DATE THEN
    -- Already read today
    RETURN;
  ELSIF last_read = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE public.user_stats
    SET last_read_date = CURRENT_DATE,
        streak_days = streak_days + 1
    WHERE user_id = _user_id;
  ELSE
    -- Streak broken
    UPDATE public.user_stats
    SET last_read_date = CURRENT_DATE,
        streak_days = 1
    WHERE user_id = _user_id;
  END IF;

  PERFORM public.check_and_award_achievements(_user_id);
END;
$$;

-- Check and Award Achievements
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_stats_rec RECORD;
  user_profile_rec RECORD;
  achievement_rec RECORD;
BEGIN
  SELECT * INTO user_stats_rec
  FROM public.user_stats
  WHERE user_id = _user_id;

  SELECT * INTO user_profile_rec
  FROM public.profiles
  WHERE id = _user_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR achievement_rec IN 
    SELECT a.* 
    FROM public.achievements a
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements ua 
      WHERE ua.user_id = _user_id AND ua.achievement_id = a.id
    )
  LOOP
    IF (achievement_rec.name = 'First Steps' AND user_stats_rec.articles_read >= 1) OR
       (achievement_rec.name = 'Knowledge Seeker' AND user_stats_rec.articles_read >= 10) OR
       (achievement_rec.name = 'Dedicated Reader' AND user_stats_rec.articles_read >= 50) OR
       (achievement_rec.name = 'AI Scholar' AND user_stats_rec.articles_read >= 100) OR
       (achievement_rec.name = 'Comment Champion' AND user_stats_rec.comments_made >= 25) OR
       (achievement_rec.name = 'Week Warrior' AND user_stats_rec.streak_days >= 7) OR
       (achievement_rec.name = 'Month Master' AND user_stats_rec.streak_days >= 30) OR
       (achievement_rec.name = 'Social Sharer' AND user_stats_rec.shares_made >= 10) OR
       (achievement_rec.name = 'Explorer' AND user_stats_rec.level = 'explorer') OR
       (achievement_rec.name = 'Enthusiast' AND user_stats_rec.level IN ('enthusiast', 'expert', 'thought_leader')) OR
       (achievement_rec.name = 'Expert' AND user_stats_rec.level IN ('expert', 'thought_leader')) OR
       (achievement_rec.name = 'Thought Leader' AND user_stats_rec.level = 'thought_leader') OR
       (achievement_rec.name = 'Digital Pioneer' AND user_profile_rec.first_name IS NOT NULL) OR
       (achievement_rec.name = 'Profile Master' AND 
        user_profile_rec.first_name IS NOT NULL AND 
        user_profile_rec.avatar_url IS NOT NULL AND 
        user_profile_rec.company IS NOT NULL AND 
        user_profile_rec.job_title IS NOT NULL AND 
        user_profile_rec.interests IS NOT NULL AND 
        array_length(user_profile_rec.interests, 1) >= 3)
    THEN
      INSERT INTO public.user_achievements (user_id, achievement_id)
      VALUES (_user_id, achievement_rec.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Handle Reading Points
CREATE OR REPLACE FUNCTION public.handle_reading_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(NEW.user_id, 10);
    
    UPDATE public.user_stats
    SET articles_read = articles_read + 1
    WHERE user_id = NEW.user_id;

    PERFORM public.update_streak(NEW.user_id);
    PERFORM public.check_and_award_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Handle Bookmark Points
CREATE OR REPLACE FUNCTION public.handle_bookmark_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.award_points(NEW.user_id, 5);
    PERFORM public.check_and_award_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Handle Comment Points
CREATE OR REPLACE FUNCTION public.handle_comment_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    PERFORM public.award_points(NEW.user_id, 15);
    
    UPDATE public.user_stats
    SET comments_made = comments_made + 1
    WHERE user_id = NEW.user_id;

    PERFORM public.check_and_award_achievements(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;