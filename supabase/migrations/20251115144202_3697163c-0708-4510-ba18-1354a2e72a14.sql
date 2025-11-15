-- Enhance bookmarks table for Smart Article Queue
ALTER TABLE bookmarks
ADD COLUMN IF NOT EXISTS queue_position INTEGER,
ADD COLUMN IF NOT EXISTS reading_priority TEXT DEFAULT 'medium' CHECK (reading_priority IN ('low', 'medium', 'high')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for queue ordering
CREATE INDEX IF NOT EXISTS idx_bookmarks_queue ON bookmarks(user_id, queue_position) WHERE completed_at IS NULL;

-- Create reading_streaks table to track user streaks
CREATE TABLE IF NOT EXISTS reading_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_read_date DATE,
  streak_start_date DATE,
  total_articles_read INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS on reading_streaks
ALTER TABLE reading_streaks ENABLE ROW LEVEL SECURITY;

-- RLS policies for reading_streaks
CREATE POLICY "Users can view their own streak"
  ON reading_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
  ON reading_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
  ON reading_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to update reading streak
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
$$ LANGUAGE plpgsql SECURITY DEFINER;