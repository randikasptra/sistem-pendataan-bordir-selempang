import { requireAuth } from '@/lib/auth'
import { signOut } from '@/app/actions/auth'
import Link from 'next/link'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAuth()
  const isVendor = profile.role === 'vendor'

  const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Purchase Orders', href: '/po' },
    { name: 'Approval', href: '/approvals' },
    { name: 'Vendors', href: '/vendors' },
    { name: 'Users', href: '/users' },
    { name: 'Settings', href: '/settings' },
  ]

  const vendorNavigation = [
    { name: 'Dashboard', href: '/vendor/dashboard' },
    { name: 'PO Saya', href: '/vendor/po' },
    { name: 'Riwayat', href: '/vendor/history' },
  ]

  const navigation = isVendor ? vendorNavigation : adminNavigation

  return (
    <div className="flex flex-col min-h-screen lg:flex-row">
      {/* Sidebar for desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <div className="flex-1 space-y-8 px-4 py-8">
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">PO Bordir</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">Distribusi</p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="space-y-4 p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-sm">
            <p className="font-medium text-gray-900 dark:text-white">{profile.full_name || 'User'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile.role}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
            >
              Logout
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header for mobile */}
        <header className="lg:hidden border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
          <div className="px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">PO Bordir</h1>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{profile.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile.role}</p>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 pb-24 lg:pb-0">
          {children}
        </main>

        {/* Bottom navigation for mobile */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 px-4 py-2">
          <div className="flex justify-around">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 text-center py-3 text-xs font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="text-center py-2 border-t border-gray-200 dark:border-gray-800">
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Logout
              </button>
            </form>
          </div>
        </nav>
      </div>
    </div>
  )
}
