import { reviewApproval } from '@/app/actions/approval'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

type Item = { title: string; completed_quantity: number; quantity: number }
type Attachment = { type: string }
type Detail = { po_number: string; po_items: Item[]; approval_requests: { vendor_note: string | null }[]; attachments: Attachment[] }
function isDetail(value: unknown): value is Detail { return typeof value === 'object' && value !== null && 'po_number' in value && 'po_items' in value && 'approval_requests' in value && 'attachments' in value }
export default async function Detail({ params }: { params: Promise<{ id: string }> }) { await requireRole(['owner','admin']); const { id } = await params; const s = await createClient(); const { data } = await s.from('purchase_orders').select('*,po_items(*),approval_requests(*),attachments(*)').eq('id', id).single(); if (!isDetail(data)) notFound(); return <main className="p-4 sm:p-8"><h1 className="text-3xl font-bold">Review {data.po_number}</h1><p className="mt-4">{data.po_items.map(item => `${item.title}: ${item.completed_quantity}/${item.quantity}`).join(', ')}</p><p>Catatan vendor: {data.approval_requests[0]?.vendor_note || '-'}</p><p>Foto hasil: {data.attachments.filter(attachment => attachment.type === 'vendor_result').length}</p><form action={reviewApproval.bind(null, id)} className="mt-6 space-y-3"><textarea className="w-full rounded border p-2" name="review_note" placeholder="Catatan revisi (wajib untuk revisi)"/><input className="w-full rounded border p-2" name="annotated_attachment_id" placeholder="ID attachment anotasi (opsional)"/><button className="rounded bg-green-600 px-4 py-2 text-white" name="decision" value="approve">Approve</button><button className="ml-2 rounded bg-red-600 px-4 py-2 text-white" name="decision" value="revision">Minta revisi</button></form></main> }
