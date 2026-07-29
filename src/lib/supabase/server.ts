import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { publicEnv } from '@/lib/env'

/**
 * Creates a Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * The client automatically manages session cookies via Next.js cookies() API.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(publicEnv.SUPABASE_URL, publicEnv.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  })
}
