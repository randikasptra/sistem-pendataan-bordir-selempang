import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

type QueueRow = { id: string; po_number: string; vendors: { name: string }[]; approval_requests: { vendor_note: string | null }[] }
function isQueueRow(value: unknown): value is QueueRow {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.id === 'string' && typeof row.po_number === 'string' && Array.isArray(row.vendors) && Array.isArray(row.approval_requests)
}

export default async function Approvals() {
  await requireRole(['owner', 'admin']); const s = await createClient()
  const { data } = await s.from('purchase_orders').select('id,po_number,vendors(name),approval_requests(vendor_note,requested_at)').eq('status', 'WAITING_APPROVAL').order('updated_at')
  const rows = Array.isArray(data) ? data.filter(isQueueRow) : []
  return <main className="p-4 sm:p-8"><h1 className="text-3xl font-bold">Antrean Approval</h1>{rows.length ? <div className="mt-6 space-y-3">{rows.map(po => <Link className="block rounded-xl border p-4" href={`/approvals/${po.id}`} key={po.id}><b>{po.po_number}</b><p className="text-sm">{po.vendors[0]?.name} · {po.approval_requests[0]?.vendor_note || 'Tanpa catatan'}</p></Link>)}</div> : <p className="mt-6 text-gray-500">Tidak ada PO menunggu approval.</p>}</main>
}
