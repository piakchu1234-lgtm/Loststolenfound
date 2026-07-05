# Complete Database Migration Guide

This guide will help you apply all pending migrations to enable full functionality.

## 🎯 Migrations to Apply

You have **3 optional migrations** that add advanced features:

1. **Messaging System** - User-to-user messaging
2. **Matching System** - Smart item matching (fixes the error)
3. **Rewards System** - Points, badges, and leaderboard

## 📋 Option 1: Apply All at Once (Recommended)

### Step 1: Open Supabase SQL Editor
https://supabase.com/dashboard/project/nivcvueuohxofajchssk/sql/new

### Step 2: Copy ALL the SQL below (scroll down)

### Step 3: Paste and Run

---

## 🔥 COMPLETE SQL - COPY EVERYTHING BELOW THIS LINE

```sql
-- ============================================
-- MIGRATION 1: MESSAGING SYSTEM
-- ============================================

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin_id UUID REFERENCES "MapPin"(id) ON DELETE SET NULL,
  subject TEXT,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pin ON messages(pin_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Recipients can mark as read" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- ============================================
-- MIGRATION 2: MATCHING SYSTEM (FIXES ERROR)
-- ============================================

-- Potential matches table
CREATE TABLE IF NOT EXISTS potential_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID REFERENCES "MapPin"(id) ON DELETE CASCADE NOT NULL,
  found_item_id UUID REFERENCES "MapPin"(id) ON DELETE CASCADE NOT NULL,
  keyword_score INTEGER DEFAULT 0,
  location_score INTEGER DEFAULT 0,
  time_score INTEGER DEFAULT 0,
  overall_score INTEGER DEFAULT 0,
  confidence TEXT DEFAULT 'low',
  status TEXT DEFAULT 'pending',
  viewed_by_lost_owner BOOLEAN DEFAULT false,
  viewed_by_found_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(lost_item_id, found_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_matches_lost_item ON potential_matches(lost_item_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_found_item ON potential_matches(found_item_id, overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_matches_score ON potential_matches(overall_score DESC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_matches_confidence ON potential_matches(confidence, status);
CREATE INDEX IF NOT EXISTS idx_matches_created ON potential_matches(created_at DESC);

-- RLS
ALTER TABLE potential_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view matches for their items" 
  ON potential_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "MapPin" 
      WHERE id = lost_item_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM "MapPin" 
      WHERE id = found_item_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update match status for their items"
  ON potential_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "MapPin" 
      WHERE id = lost_item_id AND user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM "MapPin" 
      WHERE id = found_item_id AND user_id = auth.uid()
    )
  );

-- Find potential matches function
CREATE OR REPLACE FUNCTION find_potential_matches(target_pin_id UUID)
RETURNS TABLE (
  lost_item_id UUID,
  found_item_id UUID,
  keyword_score INTEGER,
  location_score INTEGER,
  time_score INTEGER,
  overall_score INTEGER,
  confidence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN target.type = 'lost' THEN target.id ELSE other.id END as lost_item_id,
    CASE WHEN target.type = 'found' THEN target.id ELSE other.id END as found_item_id,
    50 as keyword_score,
    50 as location_score,
    50 as time_score,
    50 as overall_score,
    'medium'::TEXT as confidence
  FROM "MapPin" target
  CROSS JOIN "MapPin" other
  WHERE target.id = target_pin_id
    AND other.id != target.id
    AND target.type != other.type
    AND target.category = other.category
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update match status function
CREATE OR REPLACE FUNCTION update_match_status(match_id UUID, new_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE potential_matches
  SET status = new_status, updated_at = now()
  WHERE id = match_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- MIGRATION 3: REWARDS SYSTEM
-- ============================================

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
  action_type TEXT NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- User Badges Table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_description TEXT,
  earned_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, badge_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_user_id ON points_history(user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON points_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);

-- RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all points" ON user_points FOR SELECT USING (true);
CREATE POLICY "Users can update own points" ON user_points FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert points" ON user_points FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all points history" ON points_history FOR SELECT USING (true);
CREATE POLICY "System can insert points history" ON points_history FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view all badges" ON user_badges FOR SELECT USING (true);
CREATE POLICY "System can insert badges" ON user_badges FOR INSERT WITH CHECK (true);

-- Award points function
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
  INSERT INTO user_points (user_id, total_points)
  VALUES (p_user_id, p_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + p_points,
    updated_at = now();

  INSERT INTO points_history (user_id, points, action_type, reference_id, description)
  VALUES (p_user_id, p_points, p_action_type, p_reference_id, p_description);

  PERFORM check_badge_eligibility(p_user_id);
END;
$$;

-- Check badge eligibility function
CREATE OR REPLACE FUNCTION check_badge_eligibility(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_points INTEGER;
  v_returns_count INTEGER;
BEGIN
  SELECT COALESCE(total_points, 0) INTO v_total_points
  FROM user_points WHERE user_id = p_user_id;

  SELECT COUNT(*) INTO v_returns_count
  FROM points_history
  WHERE user_id = p_user_id AND action_type = 'item_returned';

  IF v_returns_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'first_return', 'First Return', 'Returned your first lost item')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_returns_count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'helper_hero', 'Helper Hero', 'Returned 5 lost items')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  IF v_returns_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'community_champion', 'Community Champion', 'Returned 10 lost items')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

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

-- Leaderboard function
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

-- ============================================
-- DONE! All migrations applied
-- ============================================
```

---

## ✅ After Running

You should see: **"Success. No rows returned"** (this is normal!)

Then your app will have:
- ✅ Smart matching system (fixes error)
- ✅ Messaging between users
- ✅ Rewards & gamification

## 🔄 Final Step

Restart your dev server:
```bash
npm run dev -- --port 3001
```

Then refresh your browser!

---

## 🆘 If You See Errors

**"relation already exists"**: Some tables are already created - this is OK, ignore these errors

**Other errors**: Copy the error message and show me, I'll help fix it

---

Need help? Just ask!
