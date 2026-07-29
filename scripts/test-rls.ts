import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const required = (name: string) => { const value = process.env[name]?.trim(); if (!value) throw new Error(`Missing ${name}`); return value }
const assert = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const url = required('NEXT_PUBLIC_SUPABASE_URL'), anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const admin = createClient(url, required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { autoRefreshToken: false, persistSession: false } })

async function signedIn(email: string, password: string) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password }); if (error) throw error
  return client
}

async function main() {
  const token = randomUUID().replaceAll('-', ''), code = `RLS-${token.slice(0, 12).toUpperCase()}`
  let vendorId: string | undefined, userId: string | undefined
  try {
    const { data: vendor, error: vendorError } = await admin.from('vendors').insert({ code, name: 'Temporary RLS Vendor B', is_active: true }).select('id').single(); if (vendorError) throw vendorError; vendorId = vendor.id
    const password = `${randomUUID()}A1!`, email = `rls-${token}@example.test`
    const { data: user, error: userError } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); if (userError) throw userError; userId = user.user.id
    const { error: profileError } = await admin.from('profiles').insert({ id: userId, full_name: 'Temporary RLS Vendor B', role: 'vendor', vendor_id: vendorId, is_active: true }); if (profileError) throw profileError
    const vendorA = await signedIn(required('SEED_VENDOR_EMAIL'), required('SEED_VENDOR_PASSWORD')), vendorB = await signedIn(email, password)
    const [{ data: aRows, error: aRead }, { data: bRows, error: bRead }] = await Promise.all([vendorA.from('vendors').select('id,code'), vendorB.from('vendors').select('id,code')])
    assert(!aRead && aRows.length === 1 && aRows[0].code === 'GRADMINE', 'Vendor A can read Vendor B')
    assert(!bRead && bRows.length === 1 && bRows[0].id === vendorId, 'Vendor B can read Vendor A')
    const [{ data: aWrite, error: aWriteError }, { data: bWrite, error: bWriteError }] = await Promise.all([vendorA.from('vendors').update({ notes: 'blocked' }).eq('id', vendorId).select('id'), vendorB.from('vendors').update({ notes: 'blocked' }).eq('code', 'GRADMINE').select('id')])
    assert(!aWriteError && aWrite.length === 0, 'Vendor A can modify Vendor B')
    assert(!bWriteError && bWrite.length === 0, 'Vendor B can modify Vendor A')
    console.log('RLS Vendor A/B isolation passed')
  } finally { if (userId) await admin.auth.admin.deleteUser(userId); if (vendorId) await admin.from('vendors').delete().eq('id', vendorId) }
}
main().catch(error => { console.error(`RLS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`); process.exitCode = 1 })
