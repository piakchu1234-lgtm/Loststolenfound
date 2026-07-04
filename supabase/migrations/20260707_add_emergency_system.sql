-- Add emergency events table
CREATE TABLE IF NOT EXISTS emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('police_call', 'alarm_activated')),
  location GEOGRAPHY(POINT, 4326),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX idx_emergency_events_user_id ON emergency_events(user_id);
CREATE INDEX idx_emergency_events_timestamp ON emergency_events(timestamp DESC);
CREATE INDEX idx_emergency_events_location ON emergency_events USING GIST(location);
CREATE INDEX idx_emergency_events_resolved ON emergency_events(resolved) WHERE resolved = FALSE;

-- Enable RLS
ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can insert their own emergency events
CREATE POLICY "Users can create emergency events"
  ON emergency_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own emergency events
CREATE POLICY "Users can view own emergency events"
  ON emergency_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin can view all emergency events (optional)
CREATE POLICY "Admin can view all emergency events"
  ON emergency_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admin can update emergency events (mark as resolved)
CREATE POLICY "Admin can update emergency events"
  ON emergency_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create function to get nearby emergency events
CREATE OR REPLACE FUNCTION get_nearby_emergencies(
  user_lat FLOAT,
  user_lng FLOAT,
  radius_meters INT DEFAULT 5000
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  event_type TEXT,
  distance_meters FLOAT,
  timestamp TIMESTAMPTZ,
  resolved BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    e.event_type,
    ST_Distance(
      e.location::geometry,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)
    ) AS distance_meters,
    e.timestamp,
    e.resolved
  FROM emergency_events e
  WHERE
    e.resolved = FALSE
    AND ST_DWithin(
      e.location::geometry,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326),
      radius_meters
    )
  ORDER BY e.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nearby_emergencies TO authenticated;

-- Add comment
COMMENT ON TABLE emergency_events IS 'Stores emergency events triggered by panic button';
COMMENT ON FUNCTION get_nearby_emergencies IS 'Get unresolved emergency events within specified radius';
