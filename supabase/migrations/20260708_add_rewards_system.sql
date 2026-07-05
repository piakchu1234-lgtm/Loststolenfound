-- Rewards and Gamification System
-- Track user points, badges, and achievements for community engagement

-- User Points Table
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

-- Points History Table
CREATE TABLE IF NOT EXISTS points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL, -- 'item_returned', 'item_found', 'claim_accepted', 'helpful_comment', 'verified_report'
  reference_id UUID, -- ID of the related pin/claim/comment
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL, -- 'first_return', 'helper_hero', 'community_champion', 'deal_hunter', etc.
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- Enable RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view all points" ON user_points
  FOR SELECT USING (true);

CREATE POLICY "Users can update own points" ON user_points
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert points" ON user_points
  FOR INSERT WITH CHECK (true);

-- RLS Policies for points_history
CREATE POLICY "Users can view all points history" ON points_history
  FOR SELECT USING (true);

CREATE POLICY "System can insert points history" ON points_history
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_badges
CREATE POLICY "Users can view all badges" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "System can insert badges" ON user_badges
  FOR INSERT WITH CHECK (true);

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update user points
  INSERT INTO user_points (user_id, total_points)
  VALUES (p_user_id, p_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + p_points,
    updated_at = now();

  -- Record in history
  INSERT INTO points_history (user_id, points, action_type, reference_id, description)
  VALUES (p_user_id, p_points, p_action_type, p_reference_id, p_description);

  -- Check for badge eligibility
  PERFORM check_badge_eligibility(p_user_id);
END;
$$;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_badge_eligibility(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_points INTEGER;
  v_returns_count INTEGER;
  v_found_count INTEGER;
BEGIN
  -- Get user stats
  SELECT COALESCE(total_points, 0) INTO v_total_points
  FROM user_points WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_returns_count
  FROM points_history
  WHERE user_id = p_user_id AND action_type = 'item_returned';

  SELECT COUNT(*) INTO v_found_count
  FROM points_history
  WHERE user_id = p_user_id AND action_type = 'item_found';

  -- Award badges based on milestones

  -- First Return Badge
  IF v_returns_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'first_return', 'First Return', 'Returned your first lost item')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Helper Hero (5 returns)
  IF v_returns_count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'helper_hero', 'Helper Hero', 'Returned 5 lost items')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Community Champion (10 returns)
  IF v_returns_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'community_champion', 'Community Champion', 'Returned 10 lost items')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Point Milestones
  IF v_total_points >= 100 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'century_club', 'Century Club', 'Earned 100 points')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_total_points >= 500 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'point_master', 'Point Master', 'Earned 500 points')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_total_points >= 1000 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'legend', 'Legend', 'Earned 1000 points')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;
END;
$$;

-- Function to get user leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  user_id UUID,
  total_points INTEGER,
  badge_count BIGINT,
  rank INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.total_points,
    COUNT(ub.id) as badge_count,
    RANK() OVER (ORDER BY up.total_points DESC)::INTEGER as rank
  FROM user_points up
  LEFT JOIN user_badges ub ON up.user_id = ub.user_id
  GROUP BY up.user_id, up.total_points
  ORDER BY up.total_points DESC
  LIMIT p_limit;
END;
$$;

-- Comments
COMMENT ON TABLE user_points IS 'Tracks total points for each user';
COMMENT ON TABLE points_history IS 'Records all point transactions';
COMMENT ON TABLE user_badges IS 'Stores earned badges for users';
COMMENT ON FUNCTION award_points IS 'Awards points to a user and checks for badge eligibility';
COMMENT ON FUNCTION check_badge_eligibility IS 'Checks and awards badges based on user achievements';
COMMENT ON FUNCTION get_leaderboard IS 'Returns top users by points with badge count';
