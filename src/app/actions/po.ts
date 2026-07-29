'use server'

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  createPOSchema,
  updatePOSchema,
  updateItemProgressSchema,
  cancelPOSchema,
} from '@/lib/validation'
import {
  vendorCanUpdateProgress,
  canEditPO,
} from '@/lib/po-utils'
import type { POItem } from '@/types'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').trim()
}

function failure(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

/**
 * Create a new draft Purchase Order with items
 */
export async function createPO(formData: FormData) {
  const currentUser = await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const vendorId = text(formData, 'vendor_id')
  const poDeadline = text(formData, 'po_deadline') || null
  const notes = text(formData, 'notes') || null

  // Parse items from FormData (they come as item_0_title, item_0_quantity, etc.)
  const items: Array<{
    title: string
    quantity: number
    item_deadline: string | null
    notes?: string
    specifications?: Record<string, unknown> | null
  }> = []
  let index = 0
  while (formData.has(`item_${index}_title`)) {
    items.push({
      title: text(formData, `item_${index}_title`),
      quantity: parseInt(text(formData, `item_${index}_quantity`), 10),
      item_deadline: text(formData, `item_${index}_deadline`) || null,
      specifications: text(formData, `item_${index}_specifications`)
        ? JSON.parse(text(formData, `item_${index}_specifications`))
        : null,
      notes: text(formData, `item_${index}_notes`) || undefined,
    })
    index++
  }

  const parsed = createPOSchema.safeParse({
    vendor_id: vendorId,
    po_deadline: poDeadline,
    notes,
    items,
  })

  if (!parsed.success) {
    failure('/po/new', parsed.error.issues[0].message)
  }

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .insert({
      vendor_id: parsed.data.vendor_id,
      po_deadline: parsed.data.po_deadline,
      notes: parsed.data.notes,
      status: 'DRAFT',
      created_by: currentUser.userId,
    })
    .select()
    .single()

  if (poError || !po) {
    failure('/po/new', 'PO gagal dibuat.')
  }

  // Insert items
  const { error: itemsError } = await supabase.from('po_items').insert(
    parsed.data.items.map((item, idx) => ({
      po_id: po.id,
      title: item.title,
      quantity: item.quantity,
      item_deadline: item.item_deadline,
      specifications: item.specifications,
      notes: item.notes,
      sort_order: idx,
    }))
  )

  if (itemsError) {
    failure('/po/new', 'Item PO gagal dibuat.')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: po.id,
    actor_id: currentUser.userId,
    action: 'PO_CREATED',
    metadata: { items_count: parsed.data.items.length },
  })

  revalidatePath('/po')
  redirect(`/po/${po.id}?success=PO%20berhasil%20dibuat.`)
}

/**
 * Update a draft Purchase Order and its items
 */
export async function updatePO(formData: FormData) {
  const currentUser = await requireRole(['owner', 'admin'])
  const supabase = await createClient()
  const poId = text(formData, 'po_id')

  // Get the current PO
  const { data: po, error: poFetchError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .single()

  if (poFetchError || !po) {
    failure(`/po/${poId}`, 'PO tidak ditemukan.')
  }

  if (!canEditPO(po.status)) {
    failure(`/po/${poId}`, `PO dengan status ${po.status} tidak dapat diedit.`)
  }

  const poDeadline = text(formData, 'po_deadline') || null
  const notes = text(formData, 'notes') || null

  // Parse items
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = []
  let index = 0
  while (formData.has(`item_${index}_title`)) {
    items.push({
      id: text(formData, `item_${index}_id`) || undefined,
      title: text(formData, `item_${index}_title`),
      quantity: parseInt(text(formData, `item_${index}_quantity`), 10),
      item_deadline: text(formData, `item_${index}_deadline`) || null,
      specifications: text(formData, `item_${index}_specifications`)
        ? JSON.parse(text(formData, `item_${index}_specifications`))
        : null,
      notes: text(formData, `item_${index}_notes`) || null,
    })
    index++
  }

  const parsed = updatePOSchema.safeParse({
    po_deadline: poDeadline,
    notes,
    items,
  })

  if (!parsed.success) {
    failure(`/po/${poId}`, parsed.error.issues[0].message)
  }

  // Update PO
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      po_deadline: parsed.data.po_deadline,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poId)

  if (updateError) {
    failure(`/po/${poId}`, 'PO gagal diperbarui.')
  }

  // Handle items: insert new, update existing, delete removed
  const existingItemIds = new Set(parsed.data.items.filter((i) => i.id).map((i) => i.id!))

  // Get current items
  const { data: currentItems } = await supabase
    .from('po_items')
    .select('id')
    .eq('po_id', poId)

  if (currentItems) {
    // Delete items not in the update
    const itemsToDelete = currentItems.filter((item) => !existingItemIds.has(item.id))
    if (itemsToDelete.length > 0) {
      await supabase
        .from('po_items')
        .delete()
        .in(
          'id',
          itemsToDelete.map((i) => i.id)
        )
    }
  }

  // Upsert items
  const { error: itemsError } = await supabase.from('po_items').upsert(
    parsed.data.items.map((item, idx) => ({
      id: item.id,
      po_id: poId,
      title: item.title,
      quantity: item.quantity,
      item_deadline: item.item_deadline,
      specifications: item.specifications,
      notes: item.notes,
      sort_order: idx,
      updated_at: new Date().toISOString(),
    }))
  )

  if (itemsError) {
    failure(`/po/${poId}`, 'Item PO gagal diperbarui.')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: poId,
    actor_id: currentUser.userId,
    action: 'PO_UPDATED',
    metadata: { items_count: parsed.data.items.length },
  })

  revalidatePath('/po')
  revalidatePath(`/po/${poId}`)
  redirect(`/po/${poId}?success=PO%20berhasil%20diperbarui.`)
}

/**
 * Send a PO (DRAFT -> SENT)
 */
export async function sendPO(poId: string) {
  const currentUser = await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const { data: po, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('*, po_items(*)')
    .eq('id', poId)
    .single()

  if (fetchError || !po) {
    failure(`/po/${poId}`, 'PO tidak ditemukan.')
  }

  if (po.status !== 'DRAFT') {
    failure(`/po/${poId}`, `PO hanya dapat dikirim dari status DRAFT.`)
  }

  if (!po.po_items || po.po_items.length === 0) {
    failure(`/po/${poId}`, 'PO harus memiliki minimal satu item.')
  }

  // Update status to SENT
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({ status: 'SENT', updated_at: new Date().toISOString() })
    .eq('id', poId)

  if (updateError) {
    failure(`/po/${poId}`, 'PO gagal dikirim.')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: poId,
    actor_id: currentUser.userId,
    action: 'PO_SENT',
    metadata: { vendor_id: po.vendor_id },
  })

  // Create notifications for all vendor staff
  const { data: vendorStaff } = await supabase
    .from('profiles')
    .select('id')
    .eq('vendor_id', po.vendor_id)
    .eq('role', 'vendor')
    .eq('is_active', true)

  if (vendorStaff && vendorStaff.length > 0) {
    const notifications = vendorStaff.map((staff) => ({
      user_id: staff.id,
      type: 'po_sent',
      title: 'PO Baru',
      body: `Anda menerima Purchase Order baru`,
      entity_type: 'purchase_order',
      entity_id: poId,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath('/po')
  revalidatePath(`/po/${poId}`)
  revalidatePath('/vendor/po')
}

/**
 * Accept a PO (SENT -> ACCEPTED) - Vendor action
 */
export async function acceptPO(poId: string) {
  const currentUser = await requireRole(['vendor'])
  const supabase = await createClient()

  const { data: po, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .eq('vendor_id', currentUser.profile.vendor_id)
    .single()

  if (fetchError || !po) {
    failure(`/vendor/po/${poId}`, 'PO tidak ditemukan atau Anda tidak memiliki akses.')
  }

  if (po.status !== 'SENT') {
    failure(`/vendor/po/${poId}`, `PO hanya dapat diterima dari status SENT.`)
  }

  // Update status to ACCEPTED
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({ status: 'ACCEPTED', updated_at: new Date().toISOString() })
    .eq('id', poId)

  if (updateError) {
    failure(`/vendor/po/${poId}`, 'PO gagal diterima.')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: poId,
    actor_id: currentUser.userId,
    action: 'PO_ACCEPTED',
    metadata: { vendor_id: po.vendor_id },
  })

  // Notify internal users
  const { data: internalUsers } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['owner', 'admin'])
    .eq('is_active', true)

  if (internalUsers && internalUsers.length > 0) {
    const notifications = internalUsers.map((user) => ({
      user_id: user.id,
      type: 'po_accepted',
      title: 'PO Diterima Vendor',
      body: `Vendor telah menerima Purchase Order`,
      entity_type: 'purchase_order',
      entity_id: poId,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath('/vendor/po')
  revalidatePath(`/vendor/po/${poId}`)
  revalidatePath('/po')
  revalidatePath(`/po/${poId}`)
}

/**
 * Update item progress (Vendor action)
 */
export async function updateItemProgress(
  poId: string,
  itemId: string,
  formData: FormData
) {
  const currentUser = await requireRole(['vendor'])
  const supabase = await createClient()

  const completedQty = parseInt(text(formData, 'completed_quantity'), 10)
  const notes = text(formData, 'notes') || null

  const parsed = updateItemProgressSchema.safeParse({
    completed_quantity: completedQty,
    notes,
  })

  if (!parsed.success) {
    failure(`/vendor/po/${poId}`, parsed.error.issues[0].message)
  }

  // Get PO and item
  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .eq('vendor_id', currentUser.profile.vendor_id)
    .single()

  if (poError || !po) {
    failure(`/vendor/po/${poId}`, 'PO tidak ditemukan atau Anda tidak memiliki akses.')
  }

  if (!vendorCanUpdateProgress(po.status)) {
    failure(
      `/vendor/po/${poId}`,
      `Progres hanya dapat diperbarui untuk PO dengan status ACCEPTED, IN_PROGRESS, atau REVISION.`
    )
  }

  const { data: item, error: itemError } = await supabase
    .from('po_items')
    .select('*')
    .eq('id', itemId)
    .eq('po_id', poId)
    .single()

  if (itemError || !item) {
    failure(`/vendor/po/${poId}`, 'Item PO tidak ditemukan.')
  }

  if (parsed.data.completed_quantity > item.quantity) {
    failure(
      `/vendor/po/${poId}`,
      `Jumlah selesai tidak boleh melebihi jumlah total (${item.quantity} pcs).`
    )
  }

  // Update item
  const { error: updateError } = await supabase
    .from('po_items')
    .update({
      completed_quantity: parsed.data.completed_quantity,
      notes: parsed.data.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)

  if (updateError) {
    failure(`/vendor/po/${poId}`, 'Progres item gagal diperbarui.')
  }

  // Auto-transition to IN_PROGRESS if not already
  if (po.status === 'ACCEPTED') {
    await supabase
      .from('purchase_orders')
      .update({ status: 'IN_PROGRESS', updated_at: new Date().toISOString() })
      .eq('id', poId)
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: poId,
    actor_id: currentUser.userId,
    action: 'ITEM_PROGRESS_UPDATED',
    metadata: {
      item_id: itemId,
      completed_quantity: parsed.data.completed_quantity,
      total_quantity: item.quantity,
    },
  })

  revalidatePath(`/vendor/po/${poId}`)
  revalidatePath('/vendor/po')
}

/**
 * Submit PO for approval (Vendor action)
 */
export async function submitPOForApproval(poId: string, formData: FormData) {
  const currentUser = await requireRole(['vendor'])
  const supabase = await createClient()

  const vendorNote = text(formData, 'vendor_note') || null

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*, po_items(*)')
    .eq('id', poId)
    .eq('vendor_id', currentUser.profile.vendor_id)
    .single()

  if (poError || !po) {
    failure(`/vendor/po/${poId}`, 'PO tidak ditemukan atau Anda tidak memiliki akses.')
  }

  if (po.status !== 'IN_PROGRESS') {
    failure(`/vendor/po/${poId}`, 'PO hanya dapat diajukan dari status IN_PROGRESS.')
  }

  // Check if all items are completed
  const allCompleted = po.po_items.every(
    (item: POItem) => item.completed_quantity >= item.quantity
  )

  if (!allCompleted) {
    failure(
      `/vendor/po/${poId}`,
      'Semua item harus selesai 100% sebelum mengajukan untuk persetujuan.'
    )
  }

  // Update status to WAITING_APPROVAL
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({ status: 'WAITING_APPROVAL', updated_at: new Date().toISOString() })
    .eq('id', poId)

  if (updateError) {
    failure(`/vendor/po/${poId}`, 'Pengajuan selesai gagal.')
  }

  // Create approval request
  const { error: approvalError } = await supabase.from('approval_requests').insert({
    po_id: poId,
    requested_by: currentUser.userId,
    status: 'pending',
    vendor_note: vendorNote,
  })

  if (approvalError) {
    failure(`/vendor/po/${poId}`, 'Approval request gagal dibuat.')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: poId,
    actor_id: currentUser.userId,
    action: 'PO_SUBMITTED_FOR_APPROVAL',
    metadata: { vendor_note: vendorNote },
  })

  // Notify internal users
  const { data: internalUsers } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['owner', 'admin'])
    .eq('is_active', true)

  if (internalUsers && internalUsers.length > 0) {
    const notifications = internalUsers.map((user) => ({
      user_id: user.id,
      type: 'approval_needed',
      title: 'PO Menunggu Persetujuan',
      body: `Purchase Order menunggu persetujuan Anda`,
      entity_type: 'purchase_order',
      entity_id: poId,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath(`/vendor/po/${poId}`)
  revalidatePath('/vendor/po')
  revalidatePath('/po')
  revalidatePath(`/po/${poId}`)
}

/**
 * Cancel a PO (Admin/Owner action)
 */
export async function cancelPO(poId: string, formData: FormData) {
  const currentUser = await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const parsed = cancelPOSchema.safeParse({
    cancellation_reason: text(formData, 'cancellation_reason'),
  })

  if (!parsed.success) {
    failure(`/po/${poId}`, parsed.error.issues[0].message)
  }

  const { data: po, error: poError } = await supabase
    .from('purchase_orders')
    .select('*')
    .eq('id', poId)
    .single()

  if (poError || !po) {
    failure(`/po/${poId}`, 'PO tidak ditemukan.')
  }

  if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
    failure(`/po/${poId}`, `PO dengan status ${po.status} tidak dapat dibatalkan.`)
  }

  // Update status to CANCELLED
  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({
      status: 'CANCELLED',
      cancelled_by: currentUser.userId,
      cancelled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.cancellation_reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', poId)

  if (updateError) {
    failure(`/po/${poId}`, 'PO gagal dibatalkan.')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: poId,
    actor_id: currentUser.userId,
    action: 'PO_CANCELLED',
    metadata: { reason: parsed.data.cancellation_reason },
  })

  // Notify vendor
  const { data: vendorStaff } = await supabase
    .from('profiles')
    .select('id')
    .eq('vendor_id', po.vendor_id)
    .eq('role', 'vendor')
    .eq('is_active', true)

  if (vendorStaff && vendorStaff.length > 0) {
    const notifications = vendorStaff.map((staff) => ({
      user_id: staff.id,
      type: 'po_cancelled',
      title: 'PO Dibatalkan',
      body: `Purchase Order telah dibatalkan`,
      entity_type: 'purchase_order',
      entity_id: poId,
    }))

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath('/po')
  revalidatePath(`/po/${poId}`)
  revalidatePath('/vendor/po')
}
