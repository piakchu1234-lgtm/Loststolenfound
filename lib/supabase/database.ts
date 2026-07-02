import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with direct database access using connection pooling
 * Use this for server-side operations that need direct database access
 *
 * Connection pooling is configured via the DATABASE_POOLER_URL environment variable
 * which uses port 6543 (PgBouncer) instead of 5432 (direct connection)
 *
 * Pool configuration:
 * - Transaction mode: balances connection reuse with transaction isolation
 * - Handles serverless function connection spikes
 * - Prevents connection exhaustion under load
 */
export function createPooledClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables for pooled client')
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

/**
 * Get database connection configuration
 * Returns the appropriate connection string based on use case
 */
export function getDatabaseConfig() {
  return {
    // Use pooler for application queries (recommended for serverless)
    poolerUrl: process.env.DATABASE_POOLER_URL,
    // Use direct connection for migrations and admin tasks
    directUrl: process.env.DATABASE_URL,
  }
}
