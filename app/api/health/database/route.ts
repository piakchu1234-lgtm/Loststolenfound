import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Database health check endpoint
 * Tests database connectivity and returns status
 *
 * GET /api/health/database
 *
 * Returns:
 * - 200: Database is healthy
 * - 503: Database is unavailable
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Simple query to test database connectivity
    const startTime = Date.now()
    const { error } = await supabase.rpc('ping', {})
    const responseTime = Date.now() - startTime

    // If ping RPC doesn't exist, try a simple query
    if (error && error.message.includes('function')) {
      const { error: queryError } = await supabase
        .from('categories')
        .select('count')
        .limit(1)
        .single()

      if (queryError) {
        throw queryError
      }
    } else if (error) {
      throw error
    }

    return NextResponse.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Database health check failed:', error)

    return NextResponse.json(
      {
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
