-- Migration: Add forum badges system
-- Description: Add badges for forum participation milestones
-- Date: 2026-07-10

-- ============================================
-- Function to check and award forum badges
-- ============================================

CREATE OR REPLACE FUNCTION check_forum_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  thread_count INTEGER;
  reply_count INTEGER;
  solution_count INTEGER;
  total_upvotes INTEGER;
BEGIN
  -- Get user's forum statistics
  SELECT COUNT(*) INTO thread_count
  FROM forum_threads
  WHERE author_id = p_user_id AND is_deleted = false;

  SELECT COUNT(*) INTO reply_count
  FROM forum_replies
  WHERE author_id = p_user_id AND is_deleted = false;

  SELECT COUNT(*) INTO solution_count
  FROM forum_replies
  WHERE author_id = p_user_id AND is_solution = true AND is_deleted = false;

  -- Calculate total upvotes received on all forum content
  SELECT COALESCE(
    (SELECT SUM(upvotes) FROM forum_replies WHERE author_id = p_user_id AND is_deleted = false),
    0
  ) INTO total_upvotes;

  -- First Thread Badge (created first thread)
  IF thread_count >= 1 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'first_thread', 'First Thread', 'Created your first forum thread')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Conversationalist Badge (10 threads)
  IF thread_count >= 10 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'conversationalist', 'Conversationalist', 'Started 10 forum discussions')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Reply Master Badge (50 replies)
  IF reply_count >= 50 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'reply_master', 'Reply Master', 'Posted 50 helpful replies')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Problem Solver Badge (5 solutions)
  IF solution_count >= 5 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'problem_solver', 'Problem Solver', 'Had 5 replies marked as solutions')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Quality Contributor Badge (100+ upvotes)
  IF total_upvotes >= 100 THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'quality_contributor', 'Quality Contributor', 'Received 100+ upvotes on forum content')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

  -- Popular Post Badge (single thread with 20+ upvotes)
  IF EXISTS (
    SELECT 1 FROM forum_threads
    WHERE author_id = p_user_id AND is_deleted = false
    AND id IN (
      SELECT thread_id FROM forum_replies
      WHERE thread_id IN (SELECT id FROM forum_threads WHERE author_id = p_user_id)
      GROUP BY thread_id
      HAVING SUM(upvotes) >= 20
    )
  ) THEN
    INSERT INTO user_badges (user_id, badge_type, badge_name, badge_description)
    VALUES (p_user_id, 'popular_post', 'Popular Post', 'Created a thread with 20+ upvotes')
    ON CONFLICT (user_id, badge_type) DO NOTHING;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger function to check badges after forum activity
-- ============================================

CREATE OR REPLACE FUNCTION trigger_check_forum_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Check badges for the author
  IF TG_TABLE_NAME = 'forum_threads' THEN
    PERFORM check_forum_badges(NEW.author_id);
  ELSIF TG_TABLE_NAME = 'forum_replies' THEN
    PERFORM check_forum_badges(NEW.author_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Triggers for badge checks
-- ============================================

-- Check badges when forum thread created
DROP TRIGGER IF EXISTS trigger_check_badges_on_thread ON forum_threads;
CREATE TRIGGER trigger_check_badges_on_thread
  AFTER INSERT ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_forum_badges();

-- Check badges when forum reply created
DROP TRIGGER IF EXISTS trigger_check_badges_on_reply ON forum_replies;
CREATE TRIGGER trigger_check_badges_on_reply
  AFTER INSERT OR UPDATE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_forum_badges();

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION check_forum_badges(UUID) IS
  'Checks user forum statistics and awards appropriate badges';

COMMENT ON FUNCTION trigger_check_forum_badges() IS
  'Trigger function to automatically check and award forum badges';
