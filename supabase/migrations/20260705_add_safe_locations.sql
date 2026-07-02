-- Safe Exchange Locations System
-- Adds safe meeting places for item exchanges

-- Table for safe exchange locations
CREATE TABLE IF NOT EXISTS safe_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'police_station',
    'shopping_center',
    'public_space',
    'cafe',
    'library',
    'community_center',
    'train_station'
  )),

  -- Location details
  address TEXT NOT NULL,
  suburb TEXT NOT NULL,
  postcode TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- Additional information
  description TEXT,
  hours TEXT, -- e.g., "24/7" or "9am-5pm Mon-Fri"
  facilities TEXT[], -- e.g., ['parking', 'cctv', 'security', 'indoor', 'food', 'restrooms']
  phone TEXT,
  website TEXT,

  -- Verification and rating
  verified BOOLEAN NOT NULL DEFAULT true,
  rating DECIMAL(3, 2), -- Average rating 0.00-5.00
  safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  INDEX idx_safe_locations_type (type),
  INDEX idx_safe_locations_suburb (suburb),
  INDEX idx_safe_locations_coords (latitude, longitude)
);

-- Table for location ratings/reviews
CREATE TABLE IF NOT EXISTS location_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES safe_locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per user per location
  UNIQUE(location_id, user_id),

  INDEX idx_location_reviews_location (location_id, rating)
);

-- Function to calculate distance between two points (already exists, but ensure it's available)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DECIMAL, lon1 DECIMAL,
  lat2 DECIMAL, lon2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
  R DECIMAL := 6371; -- Earth radius in km
  dLat DECIMAL;
  dLon DECIMAL;
  a DECIMAL;
  c DECIMAL;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);

  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);

  c := 2 * atan2(sqrt(a), sqrt(1-a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find nearest safe locations
CREATE OR REPLACE FUNCTION find_nearest_safe_locations(
  p_latitude DECIMAL,
  p_longitude DECIMAL,
  p_limit INTEGER DEFAULT 10,
  p_max_distance_km DECIMAL DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type TEXT,
  address TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_km DECIMAL,
  hours TEXT,
  facilities TEXT[],
  safety_score INTEGER,
  rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.name,
    sl.type,
    sl.address,
    sl.latitude,
    sl.longitude,
    calculate_distance(p_latitude, p_longitude, sl.latitude, sl.longitude) AS distance_km,
    sl.hours,
    sl.facilities,
    sl.safety_score,
    sl.rating
  FROM safe_locations sl
  WHERE sl.verified = true
    AND calculate_distance(p_latitude, p_longitude, sl.latitude, sl.longitude) <= p_max_distance_km
  ORDER BY distance_km ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to recommend safe location for two parties
CREATE OR REPLACE FUNCTION recommend_safe_location_for_exchange(
  p_location1_lat DECIMAL,
  p_location1_lng DECIMAL,
  p_location2_lat DECIMAL,
  p_location2_lng DECIMAL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  type TEXT,
  address TEXT,
  distance_km DECIMAL,
  priority_score DECIMAL
) AS $$
DECLARE
  midpoint_lat DECIMAL;
  midpoint_lng DECIMAL;
BEGIN
  -- Calculate midpoint
  midpoint_lat := (p_location1_lat + p_location2_lat) / 2;
  midpoint_lng := (p_location1_lng + p_location2_lng) / 2;

  -- Find locations near midpoint with priority scoring
  RETURN QUERY
  SELECT
    sl.id,
    sl.name,
    sl.type,
    sl.address,
    calculate_distance(midpoint_lat, midpoint_lng, sl.latitude, sl.longitude) AS distance_km,
    -- Priority score: police stations first, then by distance and safety score
    (CASE
      WHEN sl.type = 'police_station' THEN 100
      WHEN sl.type = 'shopping_center' THEN 80
      WHEN sl.type = 'community_center' THEN 70
      WHEN sl.type = 'library' THEN 60
      WHEN sl.type = 'train_station' THEN 50
      ELSE 40
    END + COALESCE(sl.safety_score, 50) - (calculate_distance(midpoint_lat, midpoint_lng, sl.latitude, sl.longitude) * 5))::DECIMAL AS priority_score
  FROM safe_locations sl
  WHERE sl.verified = true
    AND calculate_distance(midpoint_lat, midpoint_lng, sl.latitude, sl.longitude) <= 10
  ORDER BY priority_score DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Function to update location rating
CREATE OR REPLACE FUNCTION update_location_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE safe_locations
  SET rating = (
    SELECT AVG(rating)::DECIMAL(3,2)
    FROM location_reviews
    WHERE location_id = NEW.location_id
  )
  WHERE id = NEW.location_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update location rating when review is added/updated
DROP TRIGGER IF EXISTS trigger_update_location_rating ON location_reviews;
CREATE TRIGGER trigger_update_location_rating
  AFTER INSERT OR UPDATE ON location_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_location_rating();

-- RLS Policies for safe_locations
ALTER TABLE safe_locations ENABLE ROW LEVEL SECURITY;

-- Everyone can view verified safe locations
CREATE POLICY "Public can view verified safe locations"
  ON safe_locations FOR SELECT
  USING (verified = true);

-- RLS Policies for location_reviews
ALTER TABLE location_reviews ENABLE ROW LEVEL SECURITY;

-- Users can view all reviews
CREATE POLICY "Users can view reviews"
  ON location_reviews FOR SELECT
  USING (true);

-- Users can create their own reviews
CREATE POLICY "Users can create reviews"
  ON location_reviews FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON location_reviews FOR UPDATE
  USING (user_id = auth.uid());

-- Pre-populate Malvern East safe locations
INSERT INTO safe_locations (name, type, address, suburb, postcode, latitude, longitude, hours, facilities, description, safety_score) VALUES
  (
    'Stonnington Police Station',
    'police_station',
    '311 Glenferrie Road, Malvern',
    'Malvern',
    '3144',
    -37.8635,
    145.0267,
    '24/7',
    ARRAY['parking', 'cctv', 'security', 'indoor', 'restrooms'],
    'Victoria Police station - safest option for exchanges. 24/7 monitoring and security.',
    100
  ),
  (
    'Chadstone Shopping Centre',
    'shopping_center',
    '1341 Dandenong Road, Chadstone',
    'Chadstone',
    '3148',
    -37.8862,
    145.0830,
    '9:00am-5:30pm Daily',
    ARRAY['parking', 'cctv', 'security', 'indoor', 'food', 'restrooms'],
    'Australia''s largest shopping center with extensive security and public areas.',
    95
  ),
  (
    'Central Park Shopping Centre',
    'shopping_center',
    '14 Clarendon Street, Malvern East',
    'Malvern East',
    '3145',
    -37.8755,
    145.0669,
    '9:00am-6:00pm Daily',
    ARRAY['parking', 'cctv', 'indoor', 'food'],
    'Local shopping center with good security and convenient parking.',
    85
  ),
  (
    'Darling Railway Station',
    'train_station',
    'Railway Parade, Malvern East',
    'Malvern East',
    '3145',
    -37.8708,
    145.0650,
    '24/7',
    ARRAY['cctv', 'lighting', 'public'],
    'Well-lit train station with CCTV coverage. Busy during peak hours.',
    80
  ),
  (
    'Malvern Library',
    'library',
    '1082 Malvern Road, Malvern',
    'Malvern',
    '3144',
    -37.8644,
    145.0314,
    '10:00am-6:00pm Mon-Fri, 9:00am-1:00pm Sat',
    ARRAY['parking', 'cctv', 'indoor', 'restrooms'],
    'Public library with staff present and secure indoor meeting areas.',
    90
  ),
  (
    'Stonnington City Council',
    'community_center',
    '311 Glenferrie Road, Malvern',
    'Malvern',
    '3144',
    -37.8635,
    145.0267,
    '8:30am-5:00pm Mon-Fri',
    ARRAY['parking', 'security', 'indoor', 'restrooms'],
    'Council offices with security and staff present during business hours.',
    90
  ),
  (
    'Lloyd Street Reserve',
    'public_space',
    'Lloyd Street, Malvern East',
    'Malvern East',
    '3145',
    -37.8722,
    145.0592,
    'Dawn to Dusk',
    ARRAY['parking', 'lighting', 'public'],
    'Well-maintained public park. Best visited during daylight hours.',
    75
  ),
  (
    'Central Park',
    'public_space',
    'Waverley Road, Malvern East',
    'Malvern East',
    '3145',
    -37.8761,
    145.0681,
    'Dawn to Dusk',
    ARRAY['lighting', 'public'],
    'Popular local park with good visibility. Recommended during daylight.',
    75
  ),
  (
    'Glenferrie Road Village',
    'shopping_center',
    'Glenferrie Road, Malvern',
    'Malvern',
    '3144',
    -37.8650,
    145.0285,
    '9:00am-5:00pm Daily',
    ARRAY['cctv', 'public', 'food'],
    'Busy shopping street with many cafes and shops. High foot traffic.',
    80
  )
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE safe_locations IS 'Pre-approved safe locations for item exchanges';
COMMENT ON COLUMN safe_locations.type IS 'Type of location: police_station (highest priority), shopping_center, public_space, cafe, library, community_center, train_station';
COMMENT ON COLUMN safe_locations.facilities IS 'Available facilities: parking, cctv, security, indoor, food, restrooms, lighting, public';
COMMENT ON COLUMN safe_locations.safety_score IS 'Safety rating 0-100 based on location type, facilities, and reviews';
COMMENT ON TABLE location_reviews IS 'User reviews and ratings for safe locations';
