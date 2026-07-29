export type UserRole = 'owner' | 'admin' | 'vendor'

export interface Profile {
  id: string
  full_name: string | null
  role: UserRole
  vendor_id: string | null
  can_manage_users: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type POStatus =
  | 'DRAFT'
  | 'SENT'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'RECONFIRMATION_REQUIRED'
  | 'WAITING_APPROVAL'
  | 'REVISION'
  | 'COMPLETED'
  | 'CANCELLED'

export type AttachmentType =
  | 'reference'
  | 'overlay'
  | 'preview'
  | 'vendor_result'
  | 'revision_annotation'

export type ApprovalStatus = 'pending' | 'approved' | 'revision_requested'

export interface Vendor {
  id: string
  code: string
  name: string
  whatsapp: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PurchaseOrder {
  id: string
  po_number: string
  vendor_id: string
  status: POStatus
  po_deadline: string | null
  version_number: number
  notes: string | null
  created_by: string
  approved_by: string | null
  approved_at: string | null
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  created_at: string
  updated_at: string
  vendor?: Vendor
  items?: POItem[]
  progress?: number
}

export interface POItem {
  id: string
  po_id: string
  title: string
  quantity: number
  completed_quantity: number
  item_deadline: string | null
  specifications: Record<string, unknown> | null
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Attachment {
  id: string
  po_id: string
  item_id: string | null
  type: AttachmentType
  storage_path: string
  mime_type: string
  original_name: string
  size_bytes: number
  uploaded_by: string
  created_at: string
}

export interface DesignVersion {
  id: string
  item_id: string
  version: number
  canvas_json: Record<string, unknown>
  preview_attachment_id: string | null
  created_by: string
  created_at: string
}

export interface ApprovalRequest {
  id: string
  po_id: string
  requested_by: string
  status: ApprovalStatus
  vendor_note: string | null
  review_note: string | null
  reviewed_by: string | null
  requested_at: string
  reviewed_at: string | null
}

export interface RevisionNote {
  id: string
  po_id: string
  item_id: string | null
  note: string
  annotated_attachment_id: string | null
  created_by: string
  created_at: string
}

export interface POVersion {
  id: string
  po_id: string
  version_number: number
  change_reason: string
  changed_fields: Record<string, unknown>
  snapshot: Record<string, unknown>
  created_by: string
  created_at: string
}

export interface ActivityLog {
  id: string
  po_id: string | null
  actor_id: string
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  entity_type: string | null
  entity_id: string | null
  read_at: string | null
  created_at: string
}
