-- Migration: Add full-text search system
-- Description: PostgreSQL full-text search for pins, forum threads, and users
-- Date: 2026-07-10

-- ============================================
-- Add search columns to tables
-- ============================================

-- Add search vector column to Pin table
ALTER TABLE "Pin" ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector column to forum_threads table
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Add search vector column to profiles table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='display_name') THEN
    ALTER TABLE profiles ADD COLUMN display_name TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='profiles' AND column_name='search_vector') THEN
    ALTER TABLE profiles ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- ============================================
-- Create GIN indexes for fast search
-- ============================================

CREATE INDEX IF NOT EXISTS idx_pin_search_vector ON "Pin" USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_forum_threads_search_vector ON forum_threads USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN (search_vector);

-- ============================================
-- Functions to update search vectors
-- ============================================

-- Update Pin search vector
CREATE OR REPLACE FUNCTION update_pin_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.status, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update forum_threads search vector
CREATE OR REPLACE FUNCTION update_forum_threads_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update profiles search vector
CREATE OR REPLACE FUNCTION update_profiles_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.email, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers to auto-update search vectors
-- ============================================

DROP TRIGGER IF EXISTS trigger_pin_search_vector_update ON "Pin";
CREATE TRIGGER trigger_pin_search_vector_update
  BEFORE INSERT OR UPDATE ON "Pin"
  FOR EACH ROW
  EXECUTE FUNCTION update_pin_search_vector();

DROP TRIGGER IF EXISTS trigger_forum_threads_search_vector_update ON forum_threads;
CREATE TRIGGER trigger_forum_threads_search_vector_update
  BEFORE INSERT OR UPDATE ON forum_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_forum_threads_search_vector();

DROP TRIGGER IF EXISTS trigger_profiles_search_vector_update ON profiles;
CREATE TRIGGER trigger_profiles_search_vector_update
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_search_vector();

-- ============================================
-- Populate existing data
-- ============================================

-- Update existing pins
UPDATE "Pin" SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(status, '')), 'D');

-- Update existing forum threads
UPDATE forum_threads SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'C');

-- Update existing profiles
UPDATE profiles SET search_vector =
  setweight(to_tsvector('english', COALESCE(display_name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(email, '')), 'B');

-- ============================================
-- Search function (unified search across all content)
-- ============================================

CREATE OR REPLACE FUNCTION search_all(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE(
  result_type TEXT,
  result_id TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  rank REAL,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY

  -- Search pins
  SELECT
    'pin'::TEXT as result_type,
    p.id::TEXT as result_id,
    p.title,
    p.description,
    p.category,
    ts_rank(p.search_vector, plainto_tsquery('english', search_query)) as rank,
    p.created_at
  FROM "Pin" p
  WHERE p.search_vector @@ plainto_tsquery('english', search_query)

  UNION ALL

  -- Search forum threads
  SELECT
    'thread'::TEXT as result_type,
    t.id::TEXT as result_id,
    t.title,
    t.content as description,
    t.category,
    ts_rank(t.search_vector, plainto_tsquery('english', search_query)) as rank,
    t.created_at
  FROM forum_threads t
  WHERE t.search_vector @@ plainto_tsquery('english', search_query)
    AND t.is_deleted = false

  UNION ALL

  -- Search users
  SELECT
    'user'::TEXT as result_type,
    pr.id::TEXT as result_id,
    COALESCE(pr.display_name, pr.email) as title,
    'User profile'::TEXT as description,
    'user'::TEXT as category,
    ts_rank(pr.search_vector, plainto_tsquery('english', search_query)) as rank,
    pr.created_at
  FROM profiles pr
  WHERE pr.search_vector @@ plainto_tsquery('english', search_query)

  ORDER BY rank DESC, created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Search suggestions function
-- ============================================

CREATE OR REPLACE FUNCTION search_suggestions(
  search_query TEXT,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  suggestion TEXT,
  result_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY

  -- Get common titles from pins
  SELECT
    DISTINCT p.title as suggestion,
    'pin'::TEXT as result_type,
    COUNT(*)::BIGINT as count
  FROM "Pin" p
  WHERE p.title ILIKE '%' || search_query || '%'
  GROUP BY p.title

  UNION ALL

  -- Get common titles from forum threads
  SELECT
    DISTINCT t.title as suggestion,
    'thread'::TEXT as result_type,
    COUNT(*)::BIGINT as count
  FROM forum_threads t
  WHERE t.title ILIKE '%' || search_query || '%'
    AND t.is_deleted = false
  GROUP BY t.title

  ORDER BY count DESC, suggestion ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION search_all IS 'Universal search across pins, forum threads, and users';
COMMENT ON FUNCTION search_suggestions IS 'Get search suggestions based on partial query';
COMMENT ON COLUMN "Pin".search_vector IS 'Full-text search vector for pins';
COMMENT ON COLUMN forum_threads.search_vector IS 'Full-text search vector for forum threads';
COMMENT ON COLUMN profiles.search_vector IS 'Full-text search vector for user profiles';
