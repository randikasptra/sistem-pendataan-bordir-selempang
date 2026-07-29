import { requireRole } from '@/lib/auth'

export default async function DashboardPage() {
  const { profile } = await requireRole(['owner', 'admin'])

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Owner / Admin</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Selamat datang, {profile.full_name || 'Admin'}.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['PO Aktif', '0'],
            ['PCS Belum Selesai', '0'],
            ['Menunggu Approval', '0'],
            ['Terlambat', '0'],
          ].map(([label, value]) => (
            <section key={label} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
            </section>
          ))}
        </div>

        <section className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Aktivitas Terbaru</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Belum ada aktivitas. Fitur PO akan diimplementasikan pada fase berikutnya.
          </p>
        </section>
      </div>
    </main>
  )
}
