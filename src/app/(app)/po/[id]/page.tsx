import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  formatPONumber,
  getStatusColor,
  getStatusLabel,
  formatDate,
  formatDateTime,
} from '@/lib/po-utils'
import { sendPO, cancelPO } from '@/app/actions/po'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import POShareActions from '@/app/components/POShareActions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PODetailPage({ params }: PageProps) {
  const { id } = await params
  await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  // Fetch PO with vendor and items
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('*, vendors(name), po_items(*)')
    .eq('id', id)
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/po" className="text-sm text-gray-500 hover:text-gray-900">
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
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="text-sm text-muted-foreground">Vendor: {(po.vendors as any)?.name || '-'}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(po.status)}`}>
                {getStatusLabel(po.status)}
              </span>
            </div>
            <POShareActions summary={`PO ${po.po_number} · Vendor ${(po.vendors as { name?: string } | null)?.name ?? '-'} · Status ${getStatusLabel(po.status)} · Deadline ${formatDate(po.po_deadline)}`} />

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Deadline PO</p>
                <p className="font-medium">{formatDate(po.po_deadline)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Progres PO</p>
                <p className="font-medium">{progress}% ({completedQty}/{totalQty} pcs)</p>
              </div>
            </div>

            {po.notes && (
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground">Catatan</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">{po.notes}</p>
              </div>
            )}

            {po.status === 'CANCELLED' && (
              <div className="border-t pt-4 bg-red-50 p-4 rounded-md border border-red-200">
                <p className="text-sm font-semibold text-red-800">Alasan Pembatalan</p>
                <p className="text-sm mt-1 text-red-700 whitespace-pre-wrap">{po.cancellation_reason}</p>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Item Selempang</h3>
            <div className="space-y-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {items.map((item: any) => {
                const itemProgress = item.quantity > 0 ? Math.round((item.completed_quantity / item.quantity) * 100) : 0
                return (
                  <div key={item.id} className="border rounded-md p-4 space-y-2 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{item.title}</h4>
                      <span className="text-sm text-muted-foreground">{item.completed_quantity} / {item.quantity} pcs ({itemProgress}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${itemProgress}%` }} />
                    </div>
                    {item.notes && (
                      <p className="text-xs text-muted-foreground mt-2">Catatan: {item.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions & Activity Logs */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Aksi PO</h3>

            {po.status === 'DRAFT' && (
              <form action={sendPO.bind(null, po.id)}>
                <button type="submit" className="w-full inline-flex h-10 items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
                  Kirim ke Vendor
                </button>
              </form>
            )}

            {po.status !== 'COMPLETED' && po.status !== 'CANCELLED' && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm text-muted-foreground">Batalkan Purchase Order</p>
                <form action={cancelPO.bind(null, po.id)} className="space-y-2">
                  <textarea
                    name="cancellation_reason"
                    required
                    placeholder="Alasan pembatalan (min 10 karakter)..."
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  />
                  <button type="submit" className="w-full inline-flex h-10 items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                    Batalkan PO
                  </button>
                </form>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-bold">Riwayat Aktivitas</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {logs && logs.length > 0 ? (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                logs.map((log: any) => (
                  <div key={log.id} className="text-xs border-b pb-2">
                    <p className="font-semibold text-gray-800">{log.action}</p>
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
