import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { publicEnv, serverEnv } from '@/lib/env'

/**
 * Creates a Supabase admin client for trusted server-side operations only.
 * Never import this file from Client Components.
 */
export function createAdminClient() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin operations')
  }

  return createClient(publicEnv.SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
