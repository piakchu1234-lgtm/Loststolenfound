/**
 * Database monitoring utilities
 * Provides functions for tracking database health and performance metrics
 */

export interface ConnectionPoolMetrics {
  active: number
  idle: number
  waiting: number
  total: number
  timestamp: string
}

export interface QueryMetrics {
  query: string
  duration: number
  timestamp: string
  success: boolean
  error?: string
}

/**
 * Log connection pool metrics
 * Note: Actual pool metrics require direct database access or monitoring tools
 * This is a placeholder for integration with monitoring systems
 */
export function logConnectionPoolMetrics(metrics: ConnectionPoolMetrics) {
  console.log('[DB Pool Metrics]', {
    active: metrics.active,
    idle: metrics.idle,
    waiting: metrics.waiting,
    total: metrics.total,
    utilization: `${((metrics.active / metrics.total) * 100).toFixed(1)}%`,
    timestamp: metrics.timestamp,
  })

  // Check for pool exhaustion
  if (metrics.active >= metrics.total * 0.9) {
    console.warn('[DB Pool Warning] Connection pool near capacity', {
      active: metrics.active,
      total: metrics.total,
    })
  }
}

/**
 * Log slow query for performance analysis
 */
export function logSlowQuery(metrics: QueryMetrics, thresholdMs: number = 1000) {
  if (metrics.duration > thresholdMs) {
    console.warn('[DB Slow Query]', {
      query: metrics.query.substring(0, 100), // Truncate for logging
      duration: `${metrics.duration}ms`,
      timestamp: metrics.timestamp,
    })
  }
}

/**
 * Log database error
 */
export function logDatabaseError(
  operation: string,
  error: Error,
  context?: Record<string, unknown>
) {
  console.error('[DB Error]', {
    operation,
    error: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Track query execution time
 */
export async function trackQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  try {
    const result = await queryFn()
    const duration = Date.now() - startTime

    logSlowQuery({
      query: queryName,
      duration,
      timestamp: new Date().toISOString(),
      success: true,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    logSlowQuery({
      query: queryName,
      duration,
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Get database metrics for monitoring endpoint
 */
export async function getDatabaseMetrics() {
  // This would integrate with actual monitoring tools
  // For now, return placeholder structure
  return {
    connectionPool: {
      active: 0,
      idle: 0,
      waiting: 0,
      total: 0,
    },
    queries: {
      total: 0,
      slow: 0,
      failed: 0,
    },
    timestamp: new Date().toISOString(),
  }
}
