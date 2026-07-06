-- Migration: Add analytics functions
-- Description: Database functions for analytics dashboard
-- Date: 2026-07-10

-- ============================================
-- Analytics Functions
-- ============================================

-- Get total points across all users
CREATE OR REPLACE FUNCTION get_total_points()
RETURNS BIGINT AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(total_points), 0)
    FROM user_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get category statistics
CREATE OR REPLACE FUNCTION get_category_stats()
RETURNS TABLE(
  category TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.category,
    COUNT(*)::BIGINT as count
  FROM "Pin" p
  GROUP BY p.category
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily activity for last N days
CREATE OR REPLACE FUNCTION get_daily_activity(days INTEGER DEFAULT 7)
RETURNS TABLE(
  date DATE,
  pins_created BIGINT,
  threads_created BIGINT,
  replies_created BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days - 1),
      CURRENT_DATE,
      '1 day'::interval
    )::DATE as date
  )
  SELECT
    ds.date,
    COALESCE(p.count, 0) as pins_created,
    COALESCE(t.count, 0) as threads_created,
    COALESCE(r.count, 0) as replies_created
  FROM date_series ds
  LEFT JOIN (
    SELECT DATE(created_at) as date, COUNT(*)::BIGINT as count
    FROM "Pin"
    WHERE created_at >= CURRENT_DATE - days
    GROUP BY DATE(created_at)
  ) p ON ds.date = p.date
  LEFT JOIN (
    SELECT DATE(created_at) as date, COUNT(*)::BIGINT as count
    FROM forum_threads
    WHERE created_at >= CURRENT_DATE - days AND is_deleted = false
    GROUP BY DATE(created_at)
  ) t ON ds.date = t.date
  LEFT JOIN (
    SELECT DATE(created_at) as date, COUNT(*)::BIGINT as count
    FROM forum_replies
    WHERE created_at >= CURRENT_DATE - days AND is_deleted = false
    GROUP BY DATE(created_at)
  ) r ON ds.date = r.date
  ORDER BY ds.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user growth over time
CREATE OR REPLACE FUNCTION get_user_growth(days INTEGER DEFAULT 30)
RETURNS TABLE(
  date DATE,
  new_users BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days - 1),
      CURRENT_DATE,
      '1 day'::interval
    )::DATE as date
  ),
  daily_signups AS (
    SELECT DATE(created_at) as date, COUNT(*)::BIGINT as count
    FROM profiles
    WHERE created_at >= CURRENT_DATE - days
    GROUP BY DATE(created_at)
  )
  SELECT
    ds.date,
    COALESCE(d.count, 0) as new_users,
    (
      SELECT COUNT(*)::BIGINT
      FROM profiles
      WHERE created_at <= ds.date
    ) as total_users
  FROM date_series ds
  LEFT JOIN daily_signups d ON ds.date = d.date
  ORDER BY ds.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get engagement metrics
CREATE OR REPLACE FUNCTION get_engagement_metrics()
RETURNS TABLE(
  metric_name TEXT,
  metric_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 'avg_points_per_user'::TEXT,
         COALESCE(AVG(total_points), 0)::NUMERIC
  FROM user_points

  UNION ALL

  SELECT 'avg_threads_per_user'::TEXT,
         (SELECT COUNT(*)::NUMERIC / NULLIF(COUNT(DISTINCT author_id), 0)
          FROM forum_threads WHERE is_deleted = false)

  UNION ALL

  SELECT 'avg_replies_per_thread'::TEXT,
         (SELECT COUNT(*)::NUMERIC / NULLIF(
           (SELECT COUNT(*) FROM forum_threads WHERE is_deleted = false), 0)
          FROM forum_replies WHERE is_deleted = false)

  UNION ALL

  SELECT 'success_rate'::TEXT,
         (SELECT COUNT(CASE WHEN status = 'resolved' THEN 1 END)::NUMERIC * 100 /
          NULLIF(COUNT(*), 0)
          FROM "Pin");
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get most active hours
CREATE OR REPLACE FUNCTION get_active_hours()
RETURNS TABLE(
  hour INTEGER,
  activity_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at)::INTEGER as hour,
    COUNT(*)::BIGINT as activity_count
  FROM (
    SELECT created_at FROM "Pin"
    UNION ALL
    SELECT created_at FROM forum_threads WHERE is_deleted = false
    UNION ALL
    SELECT created_at FROM forum_replies WHERE is_deleted = false
  ) combined
  GROUP BY hour
  ORDER BY hour;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get retention metrics (users active in last N days)
CREATE OR REPLACE FUNCTION get_retention_metrics(days INTEGER DEFAULT 30)
RETURNS TABLE(
  period TEXT,
  active_users BIGINT,
  retention_rate NUMERIC
) AS $$
DECLARE
  total_users BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM profiles;

  RETURN QUERY
  SELECT
    '7_days'::TEXT as period,
    COUNT(DISTINCT user_id)::BIGINT as active_users,
    (COUNT(DISTINCT user_id)::NUMERIC / NULLIF(total_users, 0) * 100)::NUMERIC as retention_rate
  FROM (
    SELECT user_id FROM "Pin" WHERE created_at >= CURRENT_DATE - 7
    UNION
    SELECT author_id FROM forum_threads WHERE created_at >= CURRENT_DATE - 7
    UNION
    SELECT author_id FROM forum_replies WHERE created_at >= CURRENT_DATE - 7
  ) active_7

  UNION ALL

  SELECT
    '30_days'::TEXT as period,
    COUNT(DISTINCT user_id)::BIGINT as active_users,
    (COUNT(DISTINCT user_id)::NUMERIC / NULLIF(total_users, 0) * 100)::NUMERIC as retention_rate
  FROM (
    SELECT user_id FROM "Pin" WHERE created_at >= CURRENT_DATE - 30
    UNION
    SELECT author_id FROM forum_threads WHERE created_at >= CURRENT_DATE - 30
    UNION
    SELECT author_id FROM forum_replies WHERE created_at >= CURRENT_DATE - 30
  ) active_30;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION get_total_points() IS 'Get sum of all points earned by users';
COMMENT ON FUNCTION get_category_stats() IS 'Get pin counts by category';
COMMENT ON FUNCTION get_daily_activity(INTEGER) IS 'Get daily activity for last N days';
COMMENT ON FUNCTION get_user_growth(INTEGER) IS 'Get user growth over last N days';
COMMENT ON FUNCTION get_engagement_metrics() IS 'Get key engagement metrics';
COMMENT ON FUNCTION get_active_hours() IS 'Get activity distribution by hour';
COMMENT ON FUNCTION get_retention_metrics(INTEGER) IS 'Get user retention rates';
