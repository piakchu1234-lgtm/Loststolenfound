-- Claims System
-- Adds claim and verification workflow for lost & found items

-- Table for storing claims
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pin_id UUID NOT NULL REFERENCES "MapPin"(id) ON DELETE CASCADE,
  claimer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Claim evidence
  claimer_evidence TEXT NOT NULL CHECK (length(claimer_evidence) >= 50),
  claimer_photos TEXT[], -- Array of photo URLs

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'cancelled')),

  -- Owner response
  owner_response TEXT,
  rejection_reason TEXT,

  -- Meeting coordination
  meeting_location TEXT,
  meeting_location_id UUID, -- Reference to safe_locations (will be added in Day 4)
  meeting_time TIMESTAMPTZ,
  meeting_notes TEXT,

  -- Completion
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT one_pending_claim_per_user_per_pin UNIQUE (pin_id, claimer_id, status)
);

-- Indexes for performance
CREATE INDEX idx_claims_pin ON claims(pin_id, status);
CREATE INDEX idx_claims_claimer ON claims(claimer_id, status);
CREATE INDEX idx_claims_status ON claims(status, created_at DESC);
CREATE INDEX idx_claims_created ON claims(created_at DESC);

-- Table for claim notifications
CREATE TABLE IF NOT EXISTS claim_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'claim_received',
    'claim_approved',
    'claim_rejected',
    'claim_completed',
    'claim_cancelled',
    'more_info_requested'
  )),

  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Index for user notifications
  INDEX idx_claim_notif_user (user_id, read, created_at DESC)
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_claims_updated_at ON claims;
CREATE TRIGGER trigger_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION update_claims_updated_at();

-- Function to create claim notification
CREATE OR REPLACE FUNCTION create_claim_notification(
  p_claim_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_message TEXT
)
RETURNS UUID AS $$
DECLARE
  notif_id UUID;
BEGIN
  INSERT INTO claim_notifications (claim_id, user_id, notification_type, message)
  VALUES (p_claim_id, p_user_id, p_type, p_message)
  RETURNING id INTO notif_id;

  RETURN notif_id;
END;
$$ LANGUAGE plpgsql;

-- Function to notify owner when claim is created
CREATE OR REPLACE FUNCTION notify_owner_on_claim()
RETURNS TRIGGER AS $$
DECLARE
  pin_owner UUID;
  pin_title TEXT;
  claimer_name TEXT;
BEGIN
  -- Get pin owner and title
  SELECT user_id, title INTO pin_owner, pin_title
  FROM "MapPin"
  WHERE id = NEW.pin_id;

  IF pin_owner IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get claimer's display name
  SELECT COALESCE(display_name, email) INTO claimer_name
  FROM profiles
  WHERE id = NEW.claimer_id;

  -- Create notification for owner
  PERFORM create_claim_notification(
    NEW.id,
    pin_owner,
    'claim_received',
    format('Someone claimed your "%s" report. Review their evidence to approve or reject.', pin_title)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify owner on new claim
DROP TRIGGER IF EXISTS trigger_notify_owner_on_claim ON claims;
CREATE TRIGGER trigger_notify_owner_on_claim
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_claim();

-- Function to notify claimer on status change
CREATE OR REPLACE FUNCTION notify_claimer_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  pin_title TEXT;
  message TEXT;
  notif_type TEXT;
BEGIN
  -- Only notify on status changes
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  -- Get pin title
  SELECT title INTO pin_title
  FROM "MapPin"
  WHERE id = NEW.pin_id;

  -- Determine notification type and message
  CASE NEW.status
    WHEN 'approved' THEN
      notif_type := 'claim_approved';
      message := format('Your claim for "%s" was approved! Coordinate a meeting time.', pin_title);
    WHEN 'rejected' THEN
      notif_type := 'claim_rejected';
      message := format('Your claim for "%s" was rejected. Reason: %s', pin_title, COALESCE(NEW.rejection_reason, 'No reason provided'));
    WHEN 'completed' THEN
      notif_type := 'claim_completed';
      message := format('Claim for "%s" marked as completed. Thank you!', pin_title);
    WHEN 'cancelled' THEN
      notif_type := 'claim_cancelled';
      message := format('Your claim for "%s" was cancelled.', pin_title);
    ELSE
      RETURN NEW;
  END CASE;

  -- Create notification
  PERFORM create_claim_notification(
    NEW.id,
    NEW.claimer_id,
    notif_type,
    message
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to notify claimer on status changes
DROP TRIGGER IF EXISTS trigger_notify_claimer_on_status_change ON claims;
CREATE TRIGGER trigger_notify_claimer_on_status_change
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION notify_claimer_on_status_change();

-- Function to update pin status when claim is completed
CREATE OR REPLACE FUNCTION update_pin_on_claim_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When claim is completed, mark pin as resolved
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE "MapPin"
    SET status = 'resolved',
        updated_at = NOW()
    WHERE id = NEW.pin_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update pin when claim completes
DROP TRIGGER IF EXISTS trigger_update_pin_on_claim_completion ON claims;
CREATE TRIGGER trigger_update_pin_on_claim_completion
  AFTER UPDATE ON claims
  FOR EACH ROW
  EXECUTE FUNCTION update_pin_on_claim_completion();

-- RLS Policies for claims
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;

-- Users can view claims for their pins or their own claims
CREATE POLICY "Users can view relevant claims"
  ON claims FOR SELECT
  USING (
    claimer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM "MapPin"
      WHERE id = claims.pin_id AND user_id = auth.uid()
    )
  );

-- Users can create claims for pins they don't own
CREATE POLICY "Users can create claims"
  ON claims FOR INSERT
  WITH CHECK (
    claimer_id = auth.uid() AND
    NOT EXISTS (
      SELECT 1 FROM "MapPin"
      WHERE id = pin_id AND user_id = auth.uid()
    )
  );

-- Pin owners can update claims (approve/reject)
-- Claimers can update their own claims (cancel)
CREATE POLICY "Relevant users can update claims"
  ON claims FOR UPDATE
  USING (
    claimer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM "MapPin"
      WHERE id = claims.pin_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for claim_notifications
ALTER TABLE claim_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON claim_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON claim_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Function to get claim count for a pin
CREATE OR REPLACE FUNCTION get_claim_count(p_pin_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM claims
  WHERE pin_id = p_pin_id
    AND status IN ('pending', 'approved');

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's claim statistics
CREATE OR REPLACE FUNCTION get_user_claim_stats(p_user_id UUID)
RETURNS TABLE(
  total_claims INTEGER,
  pending_claims INTEGER,
  approved_claims INTEGER,
  completed_claims INTEGER,
  rejected_claims INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_claims,
    COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_claims,
    COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS approved_claims,
    COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_claims,
    COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected_claims
  FROM claims
  WHERE claimer_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE claims IS 'Stores claims for lost/found items with verification workflow';
COMMENT ON COLUMN claims.claimer_evidence IS 'Description of why the claimer believes this is their item (min 50 chars)';
COMMENT ON COLUMN claims.claimer_photos IS 'Optional verification photos provided by claimer';
COMMENT ON COLUMN claims.status IS 'Claim status: pending (new), approved (owner accepted), rejected (owner denied), completed (item returned), cancelled (claimer withdrew)';
COMMENT ON COLUMN claims.meeting_location IS 'Chosen safe meeting location description';
COMMENT ON COLUMN claims.meeting_time IS 'Scheduled time for item exchange';
COMMENT ON TABLE claim_notifications IS 'Notifications related to claim status changes';
