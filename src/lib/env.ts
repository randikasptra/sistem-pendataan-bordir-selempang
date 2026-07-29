import { z } from 'zod'

const envSchema = z.object({
  // Public env vars (available in browser)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),

  // Private env vars (server-side only)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required').optional(),
})

// Parse and validate at build/runtime
const env = envSchema.parse(process.env)

export const publicEnv = {
  SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  APP_URL: env.NEXT_PUBLIC_APP_URL,
}

export const serverEnv = {
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
}
