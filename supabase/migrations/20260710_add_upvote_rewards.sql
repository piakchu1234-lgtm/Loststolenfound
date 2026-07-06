-- Migration: Add upvote rewards system
-- Description: Award points when users receive upvotes on forum content
-- Date: 2026-07-10

-- ============================================
-- Function to award points for upvotes
-- ============================================

CREATE OR REPLACE FUNCTION award_upvote_points()
RETURNS TRIGGER AS $$
DECLARE
  content_author_id UUID;
  points_to_award INTEGER := 2;
BEGIN
  -- Only award points for upvotes (vote = 1), not downvotes
  IF NEW.vote = 1 THEN
    -- Check if this is for a forum reply
    IF TG_TABLE_NAME = 'forum_reply_votes' THEN
      -- Get the reply author
      SELECT author_id INTO content_author_id
      FROM forum_replies
      WHERE id = NEW.reply_id;

      IF content_author_id IS NOT NULL THEN
        -- Award points to the reply author
        PERFORM award_points(
          content_author_id,
          points_to_award,
          'forum_upvote_received',
          NEW.reply_id::TEXT,
          'Received upvote on forum reply'
        );
      END IF;
    END IF;

    -- Check if this is for a comment
    IF TG_TABLE_NAME = 'comment_votes' THEN
      -- Get the comment author
      SELECT user_id INTO content_author_id
      FROM comments
      WHERE id = NEW.comment_id;

      IF content_author_id IS NOT NULL THEN
        -- Award points to the comment author
        PERFORM award_points(
          content_author_id,
          points_to_award,
          'forum_upvote_received',
          NEW.comment_id::TEXT,
          'Received upvote on comment'
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Triggers for upvote rewards
-- ============================================

-- Trigger for forum reply upvotes
DROP TRIGGER IF EXISTS trigger_award_reply_upvote_points ON forum_reply_votes;
CREATE TRIGGER trigger_award_reply_upvote_points
  AFTER INSERT OR UPDATE ON forum_reply_votes
  FOR EACH ROW
  EXECUTE FUNCTION award_upvote_points();

-- Trigger for comment upvotes
DROP TRIGGER IF EXISTS trigger_award_comment_upvote_points ON comment_votes;
CREATE TRIGGER trigger_award_comment_upvote_points
  AFTER INSERT OR UPDATE ON comment_votes
  FOR EACH ROW
  EXECUTE FUNCTION award_upvote_points();

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION award_upvote_points() IS
  'Awards 2 points to content author when their content receives an upvote';

COMMENT ON TRIGGER trigger_award_reply_upvote_points ON forum_reply_votes IS
  'Awards points when a forum reply receives an upvote';

COMMENT ON TRIGGER trigger_award_comment_upvote_points ON comment_votes IS
  'Awards points when a comment receives an upvote';
