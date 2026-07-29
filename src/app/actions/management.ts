'use server'

import { requireUserManagement, requireVendorManagement } from '@/lib/management-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { managedUserSchema, vendorSchema } from '@/lib/validation'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim()
}

function failure(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

export async function createVendor(formData: FormData) {
  await requireVendorManagement()
  const parsed = vendorSchema.safeParse({
    code: text(formData, 'code').toUpperCase(), name: text(formData, 'name'),
    whatsapp: text(formData, 'whatsapp') || undefined, notes: text(formData, 'notes') || undefined,
  })
  if (!parsed.success) failure('/vendors', parsed.error.issues[0].message)
  const { error } = await createAdminClient().from('vendors').insert({ ...parsed.data, is_active: true })
  if (error) failure('/vendors', error.code === '23505' ? 'Kode vendor sudah digunakan.' : 'Vendor gagal dibuat.')
  revalidatePath('/vendors'); redirect('/vendors?success=Vendor%20berhasil%20dibuat.')
}

export async function updateVendor(formData: FormData) {
  await requireVendorManagement()
  const id = text(formData, 'id')
  const parsed = vendorSchema.safeParse({ code: text(formData, 'code').toUpperCase(), name: text(formData, 'name'), whatsapp: text(formData, 'whatsapp') || undefined, notes: text(formData, 'notes') || undefined })
  if (!zUuid(id) || !parsed.success) failure('/vendors', 'Data vendor tidak valid.')
  const { error } = await createAdminClient().from('vendors').update({ ...parsed.data, is_active: formData.get('is_active') === 'on', updated_at: new Date().toISOString() }).eq('id', id)
  if (error) failure(`/vendors/${id}`, 'Vendor gagal diperbarui.')
  revalidatePath('/vendors'); revalidatePath(`/vendors/${id}`); redirect(`/vendors/${id}?success=Vendor%20berhasil%20diperbarui.`)
}

export async function createManagedUser(formData: FormData) {
  await requireUserManagement()
  const parsed = managedUserSchema.safeParse({ email: text(formData, 'email'), fullName: text(formData, 'full_name'), role: text(formData, 'role'), vendorId: text(formData, 'vendor_id') || null, canManageUsers: formData.get('can_manage_users') === 'on' })
  if (!parsed.success) failure('/users', parsed.error.issues[0].message)
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email)
  if (error || !data.user) failure('/users', 'Undangan akun gagal dikirim. Pastikan email belum digunakan.')
  const { error: profileError } = await admin.from('profiles').upsert({ id: data.user.id, full_name: parsed.data.fullName, role: parsed.data.role, vendor_id: parsed.data.vendorId, can_manage_users: parsed.data.role === 'admin' && parsed.data.canManageUsers, is_active: true, updated_at: new Date().toISOString() })
  if (profileError) failure('/users', 'Akun dibuat tetapi profile gagal disimpan.')
  revalidatePath('/users'); redirect('/users?success=Undangan%20akun%20berhasil%20dikirim.')
}

export async function setManagedUserActive(formData: FormData) {
  const actor = await requireUserManagement(); const id = text(formData, 'id'); const nextActive = formData.get('is_active') === 'true'
  if (!zUuid(id) || id === actor.userId) failure('/users', 'Anda tidak dapat mengubah status akun sendiri.')
  const { error } = await createAdminClient().from('profiles').update({ is_active: nextActive, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) failure('/users', 'Status akun gagal diperbarui.')
  revalidatePath('/users'); redirect(`/users?success=Akun%20berhasil%20${nextActive ? 'diaktifkan' : 'dinonaktifkan'}.`)
}

function zUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
