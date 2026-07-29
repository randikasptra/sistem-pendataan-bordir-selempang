import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatPONumber, getStatusColor, getStatusLabel, formatDate } from '@/lib/po-utils'
import Link from 'next/link'

export const metadata = { title: 'Purchase Orders' }

export default async function POListPage() {
  await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const { data: pos, error } = await supabase
    .from('purchase_orders')
    .select('*, vendors(name), po_items(quantity, completed_quantity)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
        <Link
          href="/po/new"
          className="inline-flex h-10 items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-gray-50 hover:bg-gray-900/90"
        >
          Buat PO
        </Link>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="[&_tr]:border-b">
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">PO Number</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vendor</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Deadline</th>
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Progress</th>
                <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {pos && pos.length > 0 ? (
                pos.map((po) => {
                  const items = po.po_items || []
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const completedQty = items.reduce((sum: number, i: any) => sum + i.completed_quantity, 0)
                  const progress = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0

                  return (
                    <tr key={po.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">{formatPONumber(po.po_number || '')}</td>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <td className="p-4 align-middle">{(po.vendors as any)?.name || '-'}</td>
                      <td className="p-4 align-middle">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(po.status)}`}>
                          {getStatusLabel(po.status)}
                        </span>
                      </td>
                      <td className="p-4 align-middle">{formatDate(po.po_deadline)}</td>
                      <td className="p-4 align-middle">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-gray-200">
                            <div className="h-2 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <Link href={`/po/${po.id}`} className="text-blue-600 hover:underline">
                          Detail
                        </Link>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="h-24 text-center align-middle text-muted-foreground">
                    Belum ada Purchase Order.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
