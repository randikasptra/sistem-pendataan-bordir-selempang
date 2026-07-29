import 'server-only'

import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function requireUserManagement() {
  const currentUser = await requireAuth()
  const { profile } = currentUser

  if (profile.role !== 'owner' && !(profile.role === 'admin' && profile.can_manage_users)) {
    redirect('/dashboard')
  }

  return currentUser
}

export async function requireVendorManagement() {
  const currentUser = await requireAuth()

  if (currentUser.profile.role === 'vendor') {
    redirect('/vendor/dashboard')
  }

  return currentUser
}
