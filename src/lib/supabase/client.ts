import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'

/**
 * Creates a Supabase client for use in Client Components.
 * Uses a singleton pattern to avoid creating multiple client instances.
 */
export function createBrowserClientInstance() {
  return createBrowserClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY)
}
