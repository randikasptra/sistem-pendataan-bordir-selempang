'use server'

import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Save design version with canvas JSON and preview
 */
export async function saveDesignVersion(
  itemId: string,
  canvasJson: string
) {
  const currentUser = await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  // Get the current version number for this item
  const { data: existingVersions } = await supabase
    .from('design_versions')
    .select('version')
    .eq('item_id', itemId)
    .order('version', { ascending: false })
    .limit(1)

  const nextVersion = existingVersions && existingVersions.length > 0
    ? existingVersions[0].version + 1
    : 1

  // Save design version
  const { data: designVersion, error } = await supabase
    .from('design_versions')
    .insert({
      item_id: itemId,
      version: nextVersion,
      canvas_json: JSON.parse(canvasJson),
      created_by: currentUser.userId,
    })
    .select()
    .single()

  if (error || !designVersion) {
    throw new Error('Failed to save design version')
  }

  // Record activity
  await supabase.from('activity_logs').insert({
    po_id: null, // We'll need to get this from the item
    actor_id: currentUser.userId,
    action: 'DESIGN_SAVED',
    metadata: { item_id: itemId, version: nextVersion },
  })

  revalidatePath(`/po/[id]`, 'page')

  return { success: true, version: nextVersion }
}

/**
 * Load latest design version for an item
 */
export async function loadDesignVersion(itemId: string) {
  await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const { data: designVersion, error } = await supabase
    .from('design_versions')
    .select('*')
    .eq('item_id', itemId)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error('Failed to load design version')
  }

  return designVersion || null
}

/**
 * Upload attachment (reference image, logo, etc.)
 */
export async function uploadAttachment(
  poId: string,
  itemId: string | null,
  type: 'reference' | 'overlay' | 'preview' | 'vendor_result',
  formData: FormData
) {
  const currentUser = await requireRole(['owner', 'admin'])
  const supabase = await createClient()

  const file = formData.get('file') as File
  if (!file) {
    throw new Error('No file provided')
  }

  // Generate storage path
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const ext = file.name.split('.').pop()
  const storagePath = itemId
    ? `po/${poId}/items/${itemId}/${type}-${timestamp}-${random}.${ext}`
    : `po/${poId}/${type}-${timestamp}-${random}.${ext}`

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('po-attachments')
    .upload(storagePath, file)

  if (uploadError) {
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Save attachment record
  const { data: attachment, error: dbError } = await supabase
    .from('attachments')
    .insert({
      po_id: poId,
      item_id: itemId,
      type,
      storage_path: storagePath,
      mime_type: file.type,
      original_name: file.name,
      size_bytes: file.size,
      uploaded_by: currentUser.userId,
    })
    .select()
    .single()

  if (dbError || !attachment) {
    throw new Error('Failed to save attachment record')
  }

  revalidatePath(`/po/${poId}`)

  return { success: true, attachment }
}
