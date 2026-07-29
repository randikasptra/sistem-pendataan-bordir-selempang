import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  formatPONumber,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatDateTime,
  calculateItemProgress,
  areAllItemsCompleted,
} from '@/lib/po-utils'
import { acceptPO, updateItemProgress, submitPOForApproval } from '@/app/actions/po'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VendorPODetailPage({ params }: PageProps) {
  const { id } = await params
  const currentUser = await requireRole(['vendor'])
  const supabase = await createClient()

  // Fetch PO with vendor and items
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('*, po_items(*)')
    .eq('id', id)
    .eq('vendor_id', currentUser.profile.vendor_id)
    .single()

  if (error || !po) {
    notFound()
  }

  // Fetch activity logs
  const { data: logs } = await supabase
    .from('activity_logs')
    .select('*, profiles(full_name)')
    .eq('po_id', id)
    .order('created_at', { ascending: false })

  const items = po.po_items || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const totalQty = items.reduce((sum: number, i: any) => sum + i.quantity, 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completedQty = items.reduce((sum: number, i: any) => sum + i.completed_quantity, 0)
  const progress = totalQty > 0 ? Math.round((completedQty / totalQty) * 100) : 0
  const allCompleted = areAllItemsCompleted(items)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/vendor/po" className="text-sm text-gray-500 hover:text-gray-900">
          ← Kembali
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Detail Purchase Order</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* PO Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-bold">{formatPONumber(po.po_number || '')}</h2>
                <p className="text-sm text-muted-foreground">Diterima pada: {formatDate(po.created_at)}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(po.status)}`}>
                {getStatusLabel(po.status)}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Deadline PO</p>
                <p className="font-medium">{formatDate(po.po_deadline)}</p>
              </div>

              <div>
                <p className="text-muted-foreground mb-2">Progres Pekerjaan PO</p>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-gray-200">
                    <div className="h-3 rounded-full bg-blue-600" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="font-semibold text-lg">{progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{completedQty} / {totalQty} pcs selesai</p>
              </div>
            </div>

            {po.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Catatan dari Admin</p>
                <p className="text-sm mt-1 whitespace-pre-wrap bg-gray-50 p-3 rounded">{po.notes}</p>
              </div>
            )}
          </div>

          {/* Items with progress update forms */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Item Selempang & Progres Pekerjaan</h3>
            <div className="space-y-6">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {items.map((item: any) => {
                const itemProgress = calculateItemProgress(item)
                const isCompleted = item.completed_quantity >= item.quantity
                const canUpdate =
                  po.status === 'ACCEPTED' || po.status === 'IN_PROGRESS' || po.status === 'REVISION'

                return (
                  <div key={item.id} className="border rounded-lg p-4 space-y-4">
                    <div className="space-y-2">
                      <h4 className="font-bold text-base">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        Deadline: {formatDate(item.item_deadline)}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progres Pekerjaan</span>
                        <span className="font-semibold">
                          {item.completed_quantity} / {item.quantity} pcs ({itemProgress}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className={`h-2 rounded-full ${isCompleted ? 'bg-green-600' : 'bg-blue-600'}`}
                          style={{ width: `${itemProgress}%` }}
                        />
                      </div>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-muted-foreground">Catatan: {item.notes}</p>
                    )}

                    {canUpdate && !isCompleted && (
                      <form
                        action={updateItemProgress.bind(null, po.id, item.id)}
                        className="border-t pt-4 space-y-3"
                      >
                        <div className="space-y-2">
                          <label htmlFor={`completed_${item.id}`} className="text-sm font-medium">
                            Update Jumlah Selesai (pcs)
                          </label>
                          <input
                            id={`completed_${item.id}`}
                            name="completed_quantity"
                            type="number"
                            min="0"
                            max={item.quantity}
                            defaultValue={item.completed_quantity}
                            required
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor={`notes_${item.id}`} className="text-sm font-medium">
                            Catatan Pengerjaan
                          </label>
                          <textarea
                            id={`notes_${item.id}`}
                            name="notes"
                            rows={2}
                            placeholder="Catatan opsional..."
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full inline-flex h-10 items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          Perbarui Progres
                        </button>
                      </form>
                    )}

                    {isCompleted && (
                      <div className="border-t pt-4 bg-green-50 p-3 rounded-md border border-green-200">
                        <p className="text-sm font-semibold text-green-800">✓ Item ini sudah 100% selesai</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions & Activity */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Aksi PO</h3>

            {po.status === 'SENT' && (
              <form action={acceptPO.bind(null, po.id)}>
                <button
                  type="submit"
                  className="w-full inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Terima PO
                </button>
              </form>
            )}

            {po.status === 'IN_PROGRESS' && allCompleted && (
              <form action={submitPOForApproval.bind(null, po.id)} className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="vendor_note" className="text-sm font-medium">
                    Catatan Penyelesaian
                  </label>
                  <textarea
                    id="vendor_note"
                    name="vendor_note"
                    rows={3}
                    placeholder="Catatan opsional untuk admin/owner..."
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full inline-flex h-10 items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
                >
                  Ajukan Selesai untuk Persetujuan
                </button>
              </form>
            )}

            {po.status === 'WAITING_APPROVAL' && (
              <div className="bg-purple-50 p-4 rounded-md border border-purple-200">
                <p className="text-sm font-semibold text-purple-900">⏳ Menunggu Persetujuan Admin</p>
                <p className="text-xs text-purple-700 mt-1">Pekerjaan Anda sedang ditinjau oleh admin/owner.</p>
              </div>
            )}

            {po.status === 'COMPLETED' && (
              <div className="bg-green-50 p-4 rounded-md border border-green-200">
                <p className="text-sm font-semibold text-green-900">✓ PO Telah Diselesaikan</p>
                <p className="text-xs text-green-700 mt-1">Disetujui pada: {formatDate(po.approved_at)}</p>
              </div>
            )}

            {po.status === 'REVISION' && (
              <div className="bg-orange-50 p-4 rounded-md border border-orange-200">
                <p className="text-sm font-semibold text-orange-900">⚠️ Revisi Diperlukan</p>
                <p className="text-xs text-orange-700 mt-1">Admin meminta revisi. Silakan periksa catatan di bawah.</p>
              </div>
            )}

            {po.status === 'CANCELLED' && (
              <div className="bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-sm font-semibold text-red-900">✕ PO Dibatalkan</p>
                <p className="text-xs text-red-700 mt-1">{po.cancellation_reason}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Riwayat Aktivitas</h3>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
              {logs && logs.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                logs.map((log: any) => (
                  <div key={log.id} className="text-xs border-b pb-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <p className="font-semibold text-gray-800">{getStatusLabel(log.action as any) || log.action}</p>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <p className="text-gray-500">Oleh: {(log.profiles as any)?.full_name || 'System'}</p>
                    <p className="text-gray-400">{formatDateTime(log.created_at)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada riwayat aktivitas.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
