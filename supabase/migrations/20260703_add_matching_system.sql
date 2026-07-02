-- Smart Matching System
-- Adds intelligent item matching with scoring algorithm

-- Table for storing potential matches
CREATE TABLE IF NOT EXISTS potential_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lost_item_id UUID NOT NULL REFERENCES "MapPin"(id) ON DELETE CASCADE,
  found_item_id UUID NOT NULL REFERENCES "MapPin"(id) ON DELETE CASCADE,

  -- Individual scoring components (0-100)
  keyword_score INTEGER NOT NULL CHECK (keyword_score >= 0 AND keyword_score <= 100),
  location_score INTEGER NOT NULL CHECK (location_score >= 0 AND location_score <= 100),
  time_score INTEGER NOT NULL CHECK (time_score >= 0 AND time_score <= 100),
  category_match BOOLEAN NOT NULL DEFAULT true,

  -- Overall weighted score (0-100)
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),

  -- Confidence level based on score
  confidence TEXT NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),

  -- Match status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'contacted', 'claimed', 'rejected', 'expired')),

  -- Metadata
  distance_km DECIMAL(10, 2), -- Distance between items in km
  time_diff_hours INTEGER, -- Time difference in hours
  matching_keywords TEXT[], -- Keywords that matched

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure unique matches (no duplicates)
  UNIQUE(lost_item_id, found_item_id)
);

-- Indexes for performance
CREATE INDEX idx_matches_lost_item ON potential_matches(lost_item_id, overall_score DESC);
CREATE INDEX idx_matches_found_item ON potential_matches(found_item_id, overall_score DESC);
CREATE INDEX idx_matches_score ON potential_matches(overall_score DESC) WHERE status = 'pending';
CREATE INDEX idx_matches_confidence ON potential_matches(confidence, status);
CREATE INDEX idx_matches_created ON potential_matches(created_at DESC);

-- Function to calculate match confidence based on score
CREATE OR REPLACE FUNCTION calculate_confidence(score INTEGER)
RETURNS TEXT AS $$
BEGIN
  IF score >= 70 THEN
    RETURN 'high';
  ELSIF score >= 50 THEN
    RETURN 'medium';
  ELSE
    RETURN 'low';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate distance between two points (Haversine formula)
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

-- Function to extract keywords from text
CREATE OR REPLACE FUNCTION extract_keywords(text_input TEXT)
RETURNS TEXT[] AS $$
DECLARE
  words TEXT[];
  common_words TEXT[] := ARRAY['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their'];
BEGIN
  -- Convert to lowercase and split into words
  words := regexp_split_to_array(lower(text_input), '\s+');

  -- Filter out common words and short words
  words := ARRAY(
    SELECT DISTINCT unnest(words)
    WHERE length(unnest) >= 3
    AND NOT (unnest = ANY(common_words))
    ORDER BY unnest
  );

  RETURN words;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate keyword similarity score
CREATE OR REPLACE FUNCTION calculate_keyword_score(
  text1 TEXT,
  text2 TEXT
)
RETURNS INTEGER AS $$
DECLARE
  keywords1 TEXT[];
  keywords2 TEXT[];
  matching_count INTEGER;
  total_count INTEGER;
  score INTEGER;
BEGIN
  keywords1 := extract_keywords(text1);
  keywords2 := extract_keywords(text2);

  IF array_length(keywords1, 1) IS NULL OR array_length(keywords2, 1) IS NULL THEN
    RETURN 0;
  END IF;

  -- Count matching keywords
  matching_count := (
    SELECT COUNT(*)
    FROM unnest(keywords1) AS k1
    WHERE k1 = ANY(keywords2)
  );

  -- Calculate score based on percentage of matching keywords
  total_count := GREATEST(array_length(keywords1, 1), array_length(keywords2, 1));
  score := ROUND((matching_count::DECIMAL / total_count) * 100);

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate location score based on distance
CREATE OR REPLACE FUNCTION calculate_location_score(distance_km DECIMAL)
RETURNS INTEGER AS $$
BEGIN
  -- Within 1km: 90-100 points
  IF distance_km < 1 THEN
    RETURN 100 - ROUND(distance_km * 10);
  -- Within 5km: 50-90 points
  ELSIF distance_km < 5 THEN
    RETURN 90 - ROUND((distance_km - 1) * 10);
  -- Within 10km: 10-50 points
  ELSIF distance_km < 10 THEN
    RETURN 50 - ROUND((distance_km - 5) * 8);
  -- Beyond 10km: 0-10 points
  ELSE
    RETURN GREATEST(0, 10 - ROUND((distance_km - 10) * 2));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate time score based on hours difference
CREATE OR REPLACE FUNCTION calculate_time_score(hours_diff INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Same day: 95-100 points
  IF hours_diff < 24 THEN
    RETURN 100 - ROUND(hours_diff::DECIMAL / 24 * 5);
  -- Within 3 days: 80-95 points
  ELSIF hours_diff < 72 THEN
    RETURN 95 - ROUND((hours_diff - 24)::DECIMAL / 48 * 15);
  -- Within 7 days: 50-80 points
  ELSIF hours_diff < 168 THEN
    RETURN 80 - ROUND((hours_diff - 72)::DECIMAL / 96 * 30);
  -- Within 14 days: 20-50 points
  ELSIF hours_diff < 336 THEN
    RETURN 50 - ROUND((hours_diff - 168)::DECIMAL / 168 * 30);
  -- Beyond 14 days: 0-20 points
  ELSE
    RETURN GREATEST(0, 20 - ROUND((hours_diff - 336)::DECIMAL / 168 * 5));
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find and score potential matches for a pin
CREATE OR REPLACE FUNCTION find_potential_matches(target_pin_id UUID)
RETURNS TABLE(
  match_id UUID,
  matched_pin_id UUID,
  keyword_score INTEGER,
  location_score INTEGER,
  time_score INTEGER,
  overall_score INTEGER,
  confidence TEXT,
  distance_km DECIMAL,
  time_diff_hours INTEGER
) AS $$
DECLARE
  target_pin RECORD;
  opposite_category TEXT;
BEGIN
  -- Get target pin details
  SELECT * INTO target_pin
  FROM "MapPin"
  WHERE id = target_pin_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Determine opposite category
  opposite_category := CASE target_pin.category
    WHEN 'lost_property' THEN 'found_property'
    WHEN 'found_property' THEN 'lost_property'
    WHEN 'missing_pet' THEN 'found_pet'
    WHEN 'found_pet' THEN 'missing_pet'
    ELSE NULL
  END;

  IF opposite_category IS NULL THEN
    RETURN;
  END IF;

  -- Find and score potential matches
  RETURN QUERY
  SELECT
    gen_random_uuid() AS match_id,
    p.id AS matched_pin_id,
    calculate_keyword_score(
      COALESCE(target_pin.title, '') || ' ' || COALESCE(target_pin.description, ''),
      COALESCE(p.title, '') || ' ' || COALESCE(p.description, '')
    ) AS keyword_score,
    calculate_location_score(
      calculate_distance(target_pin.latitude, target_pin.longitude, p.latitude, p.longitude)
    ) AS location_score,
    calculate_time_score(
      ROUND(EXTRACT(EPOCH FROM (p.created_at - target_pin.created_at)) / 3600)::INTEGER
    ) AS time_score,
    ROUND(
      calculate_keyword_score(
        COALESCE(target_pin.title, '') || ' ' || COALESCE(target_pin.description, ''),
        COALESCE(p.title, '') || ' ' || COALESCE(p.description, '')
      ) * 0.4 +
      calculate_location_score(
        calculate_distance(target_pin.latitude, target_pin.longitude, p.latitude, p.longitude)
      ) * 0.3 +
      calculate_time_score(
        ROUND(EXTRACT(EPOCH FROM (p.created_at - target_pin.created_at)) / 3600)::INTEGER
      ) * 0.2 +
      10 -- Category match bonus
    )::INTEGER AS overall_score,
    calculate_confidence(
      ROUND(
        calculate_keyword_score(
          COALESCE(target_pin.title, '') || ' ' || COALESCE(target_pin.description, ''),
          COALESCE(p.title, '') || ' ' || COALESCE(p.description, '')
        ) * 0.4 +
        calculate_location_score(
          calculate_distance(target_pin.latitude, target_pin.longitude, p.latitude, p.longitude)
        ) * 0.3 +
        calculate_time_score(
          ROUND(EXTRACT(EPOCH FROM (p.created_at - target_pin.created_at)) / 3600)::INTEGER
        ) * 0.2 +
        10
      )::INTEGER
    ) AS confidence,
    calculate_distance(target_pin.latitude, target_pin.longitude, p.latitude, p.longitude) AS distance_km,
    ROUND(EXTRACT(EPOCH FROM (p.created_at - target_pin.created_at)) / 3600)::INTEGER AS time_diff_hours
  FROM "MapPin" p
  WHERE p.category = opposite_category
    AND p.status = 'open'
    AND p.id != target_pin_id
    AND ABS(EXTRACT(EPOCH FROM (p.created_at - target_pin.created_at)) / 3600) <= 336 -- Within 14 days
    AND calculate_distance(target_pin.latitude, target_pin.longitude, p.latitude, p.longitude) <= 10 -- Within 10km
  ORDER BY overall_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to automatically find matches when a new pin is created
CREATE OR REPLACE FUNCTION auto_find_matches()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process for matchable categories
  IF NEW.category IN ('lost_property', 'found_property', 'missing_pet', 'found_pet') THEN
    -- Insert matches into potential_matches table
    INSERT INTO potential_matches (
      lost_item_id,
      found_item_id,
      keyword_score,
      location_score,
      time_score,
      overall_score,
      confidence,
      distance_km,
      time_diff_hours,
      category_match
    )
    SELECT
      CASE
        WHEN NEW.category IN ('lost_property', 'missing_pet') THEN NEW.id
        ELSE m.matched_pin_id
      END,
      CASE
        WHEN NEW.category IN ('found_property', 'found_pet') THEN NEW.id
        ELSE m.matched_pin_id
      END,
      m.keyword_score,
      m.location_score,
      m.time_score,
      m.overall_score,
      m.confidence,
      m.distance_km,
      m.time_diff_hours,
      true
    FROM find_potential_matches(NEW.id) m
    WHERE m.overall_score >= 30 -- Only store matches with score >= 30
    ON CONFLICT (lost_item_id, found_item_id) DO UPDATE
    SET
      keyword_score = EXCLUDED.keyword_score,
      location_score = EXCLUDED.location_score,
      time_score = EXCLUDED.time_score,
      overall_score = EXCLUDED.overall_score,
      confidence = EXCLUDED.confidence,
      distance_km = EXCLUDED.distance_km,
      time_diff_hours = EXCLUDED.time_diff_hours,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_find_matches ON "MapPin";
CREATE TRIGGER trigger_auto_find_matches
  AFTER INSERT ON "MapPin"
  FOR EACH ROW
  EXECUTE FUNCTION auto_find_matches();

-- Function to update match status
CREATE OR REPLACE FUNCTION update_match_status(
  match_id UUID,
  new_status TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE potential_matches
  SET
    status = new_status,
    updated_at = NOW()
  WHERE id = match_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for potential_matches
ALTER TABLE potential_matches ENABLE ROW LEVEL SECURITY;

-- Users can view matches for their own pins
CREATE POLICY "Users can view matches for their pins"
  ON potential_matches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "MapPin"
      WHERE id IN (lost_item_id, found_item_id)
      AND user_id = auth.uid()
    )
  );

-- Users can update match status for their pins
CREATE POLICY "Users can update matches for their pins"
  ON potential_matches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "MapPin"
      WHERE id IN (lost_item_id, found_item_id)
      AND user_id = auth.uid()
    )
  );

-- Comments
COMMENT ON TABLE potential_matches IS 'Stores potential matches between lost and found items with scoring';
COMMENT ON COLUMN potential_matches.keyword_score IS 'Keyword similarity score (0-100)';
COMMENT ON COLUMN potential_matches.location_score IS 'Location proximity score (0-100)';
COMMENT ON COLUMN potential_matches.time_score IS 'Time proximity score (0-100)';
COMMENT ON COLUMN potential_matches.overall_score IS 'Weighted overall match score (0-100)';
COMMENT ON COLUMN potential_matches.confidence IS 'Match confidence level: high (70+), medium (50-69), low (<50)';
