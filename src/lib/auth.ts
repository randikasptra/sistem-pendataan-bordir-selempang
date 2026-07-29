import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { Profile, UserRole } from '@/types'
import { redirect } from 'next/navigation'

/**
 * Gets the currently authenticated user and their profile.
 * Returns null if no user is authenticated.
 */
export async function getCurrentUser(): Promise<{
  userId: string
  profile: Profile
} | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return null
  }

  return {
    userId: user.id,
    profile: profile as Profile,
  }
}

/**
 * Requires an authenticated user. Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<{
  userId: string
  profile: Profile
}> {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  if (!currentUser.profile.is_active) {
    // Inactive user should not be able to access the app
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return currentUser
}

/**
 * Requires a specific role. Redirects based on the user's actual role.
 */
export async function requireRole(
  allowedRoles: UserRole[]
): Promise<{
  userId: string
  profile: Profile
}> {
  const currentUser = await requireAuth()

  if (!allowedRoles.includes(currentUser.profile.role)) {
    // Redirect user to their appropriate dashboard
    const roleRedirects: Record<UserRole, string> = {
      owner: '/dashboard',
      admin: '/dashboard',
      vendor: '/vendor/dashboard',
    }
    redirect(roleRedirects[currentUser.profile.role])
  }

  return currentUser
}

/**
 * Returns the dashboard path for a given role.
 */
export function getDashboardPath(role: UserRole): string {
  switch (role) {
    case 'owner':
    case 'admin':
      return '/dashboard'
    case 'vendor':
      return '/vendor/dashboard'
    default:
      return '/login'
  }
}
