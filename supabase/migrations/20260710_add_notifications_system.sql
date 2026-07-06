-- Migration: Add notifications system
-- Description: Real-time notifications for forum activity, matches, and claims
-- Date: 2026-07-10

-- ============================================
-- Notifications Table
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'forum_reply', 'solution_marked', 'match_found', 'claim_update', 'badge_earned', 'upvote'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to navigate to
  reference_id TEXT, -- ID of related content
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Indexes
  CONSTRAINT notifications_type_check CHECK (type IN (
    'forum_reply', 'solution_marked', 'match_found', 'claim_update', 'badge_earned', 'upvote', 'milestone'
  ))
);

-- Index for faster queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link, reference_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_reference_id)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = p_user_id AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Trigger Functions for Auto-Notifications
-- ============================================

-- Notify when someone replies to your thread
CREATE OR REPLACE FUNCTION notify_thread_reply()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  thread_title TEXT;
BEGIN
  -- Get thread author
  SELECT author_id, title INTO thread_author_id, thread_title
  FROM forum_threads
  WHERE id = NEW.thread_id;

  -- Don't notify if replying to own thread
  IF thread_author_id != NEW.author_id THEN
    PERFORM create_notification(
      thread_author_id,
      'forum_reply',
      'New reply on your thread',
      'Someone replied to "' || thread_title || '"',
      '/forum/' || (SELECT slug FROM forum_threads WHERE id = NEW.thread_id),
      NEW.id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify when your reply is marked as solution
CREATE OR REPLACE FUNCTION notify_solution_marked()
RETURNS TRIGGER AS $$
DECLARE
  thread_title TEXT;
BEGIN
  -- Only notify when is_solution changes from false to true
  IF NEW.is_solution = true AND (OLD.is_solution IS NULL OR OLD.is_solution = false) THEN
    SELECT title INTO thread_title
    FROM forum_threads
    WHERE id = NEW.thread_id;

    PERFORM create_notification(
      NEW.author_id,
      'solution_marked',
      '✅ Your reply was marked as solution!',
      'Your answer helped solve "' || thread_title || '". +25 points!',
      '/forum/' || (SELECT slug FROM forum_threads WHERE id = NEW.thread_id),
      NEW.id::TEXT
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify when user earns a new badge
CREATE OR REPLACE FUNCTION notify_badge_earned()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification(
    NEW.user_id,
    'badge_earned',
    '🏅 New badge earned!',
    'You earned the "' || NEW.badge_name || '" badge',
    '/profile/' || NEW.user_id::TEXT,
    NEW.id::TEXT
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify on point milestones
CREATE OR REPLACE FUNCTION notify_point_milestones()
RETURNS TRIGGER AS $$
DECLARE
  milestone INTEGER;
  milestones INTEGER[] := ARRAY[100, 250, 500, 1000, 2500, 5000];
BEGIN
  -- Check if user crossed a milestone
  FOREACH milestone IN ARRAY milestones
  LOOP
    IF OLD.total_points < milestone AND NEW.total_points >= milestone THEN
      PERFORM create_notification(
        NEW.user_id,
        'milestone',
        '🎉 Milestone reached!',
        'You''ve earned ' || milestone || ' points!',
        '/profile/' || NEW.user_id::TEXT,
        NULL
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Triggers
-- ============================================

-- Trigger for thread replies
DROP TRIGGER IF EXISTS trigger_notify_thread_reply ON forum_replies;
CREATE TRIGGER trigger_notify_thread_reply
  AFTER INSERT ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_thread_reply();

-- Trigger for solution marked
DROP TRIGGER IF EXISTS trigger_notify_solution_marked ON forum_replies;
CREATE TRIGGER trigger_notify_solution_marked
  AFTER UPDATE ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION notify_solution_marked();

-- Trigger for new badges
DROP TRIGGER IF EXISTS trigger_notify_badge_earned ON user_badges;
CREATE TRIGGER trigger_notify_badge_earned
  AFTER INSERT ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION notify_badge_earned();

-- Trigger for point milestones
DROP TRIGGER IF EXISTS trigger_notify_point_milestones ON user_points;
CREATE TRIGGER trigger_notify_point_milestones
  AFTER UPDATE ON user_points
  FOR EACH ROW
  EXECUTE FUNCTION notify_point_milestones();

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE notifications IS 'Real-time notifications for user activity';
COMMENT ON FUNCTION create_notification IS 'Creates a new notification for a user';
COMMENT ON FUNCTION notify_thread_reply IS 'Notifies thread author when someone replies';
COMMENT ON FUNCTION notify_solution_marked IS 'Notifies reply author when marked as solution';
COMMENT ON FUNCTION notify_badge_earned IS 'Notifies user when they earn a new badge';
COMMENT ON FUNCTION notify_point_milestones IS 'Notifies user when they reach point milestones';
