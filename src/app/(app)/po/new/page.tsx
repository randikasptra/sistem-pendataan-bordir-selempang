import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createPO } from '@/app/actions/po'
import Link from 'next/link'

export const metadata = { title: 'Buat Purchase Order' }

export default async function NewPOPage() {
  await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) throw error

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/po" className="text-sm text-gray-500 hover:text-gray-900">
          ← Kembali
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Buat Purchase Order Baru</h1>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <form action={createPO} className="space-y-6">
          <div className="space-y-4 border-b pb-6">
            <h2 className="text-lg font-medium">Informasi Utama</h2>

            <div className="space-y-2">
              <label htmlFor="vendor_id" className="text-sm font-medium leading-none">
                Vendor Tujuan <span className="text-red-500">*</span>
              </label>
              <select
                id="vendor_id"
                name="vendor_id"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Pilih vendor...</option>
                {vendors?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="po_deadline" className="text-sm font-medium leading-none">
                Deadline PO
              </label>
              <input
                id="po_deadline"
                name="po_deadline"
                type="datetime-local"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium leading-none">
                Catatan Umum
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Item PO</h2>
              <span className="text-xs text-muted-foreground">(Sementara hanya 1 item via form statis)</span>
            </div>

            {/* Minimal implementation for MVP form - a real app would use JS to add/remove items */}
            <div className="space-y-4 rounded-md border p-4 bg-gray-50">
              <div className="space-y-2">
                <label htmlFor="item_0_title" className="text-sm font-medium leading-none">
                  Judul Item <span className="text-red-500">*</span>
                </label>
                <input
                  id="item_0_title"
                  name="item_0_title"
                  required
                  placeholder="Contoh: Selempang Bludru Hitam"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="item_0_quantity" className="text-sm font-medium leading-none">
                    Jumlah (pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="item_0_quantity"
                    name="item_0_quantity"
                    type="number"
                    min="1"
                    defaultValue="1"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="item_0_deadline" className="text-sm font-medium leading-none">
                    Deadline Item
                  </label>
                  <input
                    id="item_0_deadline"
                    name="item_0_deadline"
                    type="datetime-local"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="item_0_notes" className="text-sm font-medium leading-none">
                  Catatan Item
                </label>
                <textarea
                  id="item_0_notes"
                  name="item_0_notes"
                  rows={2}
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link
              href="/po"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 hover:bg-gray-900/90"
            >
              Simpan Draft
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
