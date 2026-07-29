import { getCurrentUser, getDashboardPath } from '@/lib/auth'
import { redirect } from 'next/navigation'

/**
 * Root page. Redirects authenticated users to their respective dashboards.
 * Redirects unauthenticated users to `/login`.
 */
export default async function RootPage() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    redirect('/login')
  }

  const destination = getDashboardPath(currentUser.profile.role)
  redirect(destination)
}
