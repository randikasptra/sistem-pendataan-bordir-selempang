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
