import { createBrowserClient } from '@supabase/ssr'

/**
 * Create a Supabase client for browser usage
 * This client is safe to use in client components and browser contexts
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
