-- Migration: Add email notification preferences
-- Description: User preferences for email notifications
-- Date: 2026-07-10

-- ============================================
-- Email Preferences Table
-- ============================================

CREATE TABLE IF NOT EXISTS email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Instant notifications
  email_on_thread_reply BOOLEAN DEFAULT true,
  email_on_solution_marked BOOLEAN DEFAULT true,
  email_on_badge_earned BOOLEAN DEFAULT true,
  email_on_milestone BOOLEAN DEFAULT true,
  email_on_claim_update BOOLEAN DEFAULT true,
  email_on_match_found BOOLEAN DEFAULT true,

  -- Digest notifications
  daily_digest_enabled BOOLEAN DEFAULT false,
  weekly_digest_enabled BOOLEAN DEFAULT true,

  -- Meta
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One preference row per user
  CONSTRAINT email_preferences_user_unique UNIQUE (user_id)
);

-- Index for fast lookups
CREATE INDEX idx_email_preferences_user_id ON email_preferences(user_id);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view own preferences"
  ON email_preferences FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert own preferences"
  ON email_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update own preferences"
  ON email_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- Helper Functions
-- ============================================

-- Get or create user preferences
CREATE OR REPLACE FUNCTION get_user_email_preferences(p_user_id UUID)
RETURNS email_preferences AS $$
DECLARE
  prefs email_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO prefs
  FROM email_preferences
  WHERE user_id = p_user_id;

  -- If not found, create default preferences
  IF NOT FOUND THEN
    INSERT INTO email_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO prefs;
  END IF;

  RETURN prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user wants email notification
CREATE OR REPLACE FUNCTION should_send_email(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  prefs email_preferences;
BEGIN
  prefs := get_user_email_preferences(p_user_id);

  CASE p_notification_type
    WHEN 'thread_reply' THEN RETURN prefs.email_on_thread_reply;
    WHEN 'solution_marked' THEN RETURN prefs.email_on_solution_marked;
    WHEN 'badge_earned' THEN RETURN prefs.email_on_badge_earned;
    WHEN 'milestone' THEN RETURN prefs.email_on_milestone;
    WHEN 'claim_update' THEN RETURN prefs.email_on_claim_update;
    WHEN 'match_found' THEN RETURN prefs.email_on_match_found;
    WHEN 'daily_digest' THEN RETURN prefs.daily_digest_enabled;
    WHEN 'weekly_digest' THEN RETURN prefs.weekly_digest_enabled;
    ELSE RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Email Queue Table (for async processing)
-- ============================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  email_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, sent, failed
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT email_queue_status_check CHECK (status IN ('pending', 'sent', 'failed'))
);

-- Index for processing queue
CREATE INDEX idx_email_queue_status ON email_queue(status, created_at);
CREATE INDEX idx_email_queue_user_id ON email_queue(user_id);

-- RLS for email queue (admin only)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only system can manage email queue"
  ON email_queue FOR ALL
  USING (false); -- No direct access, only via functions

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE email_preferences IS 'User preferences for email notifications';
COMMENT ON TABLE email_queue IS 'Queue for async email processing';
COMMENT ON FUNCTION get_user_email_preferences IS 'Get or create user email preferences';
COMMENT ON FUNCTION should_send_email IS 'Check if user wants a specific email notification';
