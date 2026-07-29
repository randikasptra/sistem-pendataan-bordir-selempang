import { createVendor } from '@/app/actions/management'
import { requireVendorManagement } from '@/lib/management-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  await requireVendorManagement()
  const { data: vendors } = await createAdminClient().from('vendors').select('*').order('name')
  const message = await searchParams
  return <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div><p className="text-sm font-medium text-blue-600">Manajemen</p><h1 className="text-3xl font-bold">Vendor</h1></div>
    {message.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-800">{message.error}</p>}
    {message.success && <p className="rounded-md bg-green-50 p-3 text-sm text-green-800">{message.success}</p>}
    <section className="rounded-xl border bg-white p-5 shadow-sm dark:bg-gray-950"><h2 className="font-semibold">Tambah vendor</h2><form action={createVendor} className="mt-4 grid gap-3 sm:grid-cols-2"><input name="code" required placeholder="Kode, contoh GRADMINE" className="rounded border p-2" /><input name="name" required placeholder="Nama vendor" className="rounded border p-2" /><input name="whatsapp" placeholder="WhatsApp (opsional)" className="rounded border p-2" /><input name="notes" placeholder="Catatan (opsional)" className="rounded border p-2" /><button className="rounded bg-blue-600 px-4 py-2 font-medium text-white sm:col-span-2">Simpan vendor</button></form></section>
    <section className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-gray-950"><div className="border-b p-5"><h2 className="font-semibold">Daftar vendor</h2></div>{vendors?.length ? <div className="divide-y">{vendors.map((vendor) => <Link key={vendor.id} href={`/vendors/${vendor.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900"><div><p className="font-medium">{vendor.name}</p><p className="text-sm text-gray-500">{vendor.code}{vendor.whatsapp ? ` · ${vendor.whatsapp}` : ''}</p></div><span className={vendor.is_active ? 'text-sm text-green-700' : 'text-sm text-gray-500'}>{vendor.is_active ? 'Aktif' : 'Nonaktif'}</span></Link>)}</div> : <p className="p-5 text-sm text-gray-500">Belum ada vendor.</p>}</section>
  </main>
}
