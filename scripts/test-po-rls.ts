import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const required = (name: string) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing ${name}`)
  return value
}
const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(message)
}
const url = required('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey = required('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const admin = createClient(url, required('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function signedIn(email: string, password: string) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw error
  return client
}

async function main() {
  const token = randomUUID().replaceAll('-', '')
  const poSuffixA = String(Math.floor(Math.random() * 900) + 100)
  const poSuffixB = String(Math.floor(Math.random() * 900) + 100)
  let vendorAId: string | undefined,
    vendorBId: string | undefined,
    userAId: string | undefined,
    userBId: string | undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendorAClient: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vendorBClient: any,
    poAId: string | undefined,
    poBId: string | undefined

  try {
    // Create two temporary vendors
    const { data: vendorA, error: vendorAError } = await admin
      .from('vendors')
      .insert({ code: `PO-RLS-A-${token.slice(0, 8)}`, name: 'Temp Vendor A', is_active: true })
      .select('id')
      .single()
    if (vendorAError) throw vendorAError
    vendorAId = vendorA.id

    const { data: vendorB, error: vendorBError } = await admin
      .from('vendors')
      .insert({ code: `PO-RLS-B-${token.slice(8, 16)}`, name: 'Temp Vendor B', is_active: true })
      .select('id')
      .single()
    if (vendorBError) throw vendorBError
    vendorBId = vendorB.id

    // Create vendor A user
    const passwordA = `${randomUUID()}A1!`,
      emailA = `po-rls-a-${token}@example.test`
    const { data: userA, error: userAError } = await admin.auth.admin.createUser({
      email: emailA,
      password: passwordA,
      email_confirm: true,
    })
    if (userAError) throw userAError
    userAId = userA.user.id
    await admin
      .from('profiles')
      .insert({
        id: userAId,
        full_name: 'Temp Vendor A User',
        role: 'vendor',
        vendor_id: vendorAId,
        is_active: true,
      })

    // Create vendor B user
    const passwordB = `${randomUUID()}B1!`,
      emailB = `po-rls-b-${token}@example.test`
    const { data: userB, error: userBError } = await admin.auth.admin.createUser({
      email: emailB,
      password: passwordB,
      email_confirm: true,
    })
    if (userBError) throw userBError
    userBId = userB.user.id
    await admin
      .from('profiles')
      .insert({
        id: userBId,
        full_name: 'Temp Vendor B User',
        role: 'vendor',
        vendor_id: vendorBId,
        is_active: true,
      })

    // Sign in as owner, vendorA, and vendorB
    const ownerClient = await signedIn(required('SEED_OWNER_EMAIL'), required('SEED_OWNER_PASSWORD'))
    vendorAClient = await signedIn(emailA, passwordA)
    vendorBClient = await signedIn(emailB, passwordB)

    // Owner creates PO for Vendor A
    const { data: ownerProfile } = await ownerClient
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .single()
    if (!ownerProfile) throw new Error('Owner profile not found')

    const { data: poA, error: poAError } = await admin
      .from('purchase_orders')
      .insert({
        po_number: `PO-2026-07-29-${poSuffixA}`,
        vendor_id: vendorAId,
        status: 'SENT',
        created_by: ownerProfile.id,
        notes: 'PO for Vendor A',
      })
      .select('id')
      .single()
    if (poAError) throw poAError
    poAId = poA.id

    // Add item to PO A
    await admin.from('po_items').insert({
      po_id: poAId,
      title: 'Test Item A',
      quantity: 10,
      completed_quantity: 0,
      sort_order: 0,
    })

    // Owner creates PO for Vendor B
    const { data: poB, error: poBError } = await admin
      .from('purchase_orders')
      .insert({
        po_number: `PO-2026-07-29-${poSuffixB}`,
        vendor_id: vendorBId,
        status: 'SENT',
        created_by: ownerProfile.id,
        notes: 'PO for Vendor B',
      })
      .select('id')
      .single()
    if (poBError) throw poBError
    poBId = poB.id

    // Add item to PO B
    await admin.from('po_items').insert({
      po_id: poBId,
      title: 'Test Item B',
      quantity: 20,
      completed_quantity: 0,
      sort_order: 0,
    })

    // Test 1: Vendor A can only see their own PO
    const { data: vendorAPOs, error: vendorAReadError } = await vendorAClient
      .from('purchase_orders')
      .select('id')
    assert(!vendorAReadError, `Vendor A read error: ${vendorAReadError?.message}`)
    assert(
      vendorAPOs.length === 1 && vendorAPOs[0].id === poAId,
      'Vendor A should only see their own PO'
    )

    // Test 2: Vendor B can only see their own PO
    const { data: vendorBPOs, error: vendorBReadError } = await vendorBClient
      .from('purchase_orders')
      .select('id')
    assert(!vendorBReadError, `Vendor B read error: ${vendorBReadError?.message}`)
    assert(
      vendorBPOs.length === 1 && vendorBPOs[0].id === poBId,
      'Vendor B should only see their own PO'
    )

    // Test 3: Vendor A cannot read Vendor B's PO by ID
    const { data: vendorACrossPO, error: vendorACrossError } = await vendorAClient
      .from('purchase_orders')
      .select('id')
      .eq('id', poBId)
      .single()
    assert(
      vendorACrossError || !vendorACrossPO,
      'Vendor A should not be able to read Vendor B PO'
    )

    // Test 4: Vendor B cannot read Vendor A's PO by ID
    const { data: vendorBCrossPO, error: vendorBCrossError } = await vendorBClient
      .from('purchase_orders')
      .select('id')
      .eq('id', poAId)
      .single()
    assert(
      vendorBCrossError || !vendorBCrossPO,
      'Vendor B should not be able to read Vendor A PO'
    )

    // Test 5: Vendor A can read their own PO items
    const { data: vendorAItems, error: vendorAItemsError } = await vendorAClient
      .from('po_items')
      .select('id')
      .eq('po_id', poAId)
    assert(!vendorAItemsError, `Vendor A items read error: ${vendorAItemsError?.message}`)
    assert(vendorAItems.length === 1, 'Vendor A should see their PO items')

    // Test 6: Vendor A cannot read Vendor B's PO items
    const { data: vendorACrossItems, error: vendorACrossItemsError } = await vendorAClient
      .from('po_items')
      .select('id')
      .eq('po_id', poBId)
    assert(!vendorACrossItemsError, 'Cross-vendor item read should not error')
    assert(vendorACrossItems.length === 0, 'Vendor A should not see Vendor B items')

    // Test 7: Vendor A can update their own PO status (accept)
    const { data: vendorAUpdate, error: vendorAUpdateError } = await vendorAClient
      .from('purchase_orders')
      .update({ status: 'ACCEPTED' })
      .eq('id', poAId)
      .select('id')
    assert(!vendorAUpdateError, `Vendor A update error: ${vendorAUpdateError?.message}`)
    assert(vendorAUpdate.length === 1, 'Vendor A should be able to update their own PO')

    // Test 8: Vendor A cannot update Vendor B's PO
    const { data: vendorACrossUpdate, error: vendorACrossUpdateError } = await vendorAClient
      .from('purchase_orders')
      .update({ status: 'ACCEPTED' })
      .eq('id', poBId)
      .select('id')
    assert(!vendorACrossUpdateError, 'Cross-vendor update should not error')
    assert(vendorACrossUpdate.length === 0, 'Vendor A should not update Vendor B PO')

    // Test 9: Vendor A can update item progress on their own items
    const { data: itemA } = await admin
      .from('po_items')
      .select('id')
      .eq('po_id', poAId)
      .single()
    if (!itemA) throw new Error('itemA not found')

    const { data: vendorAItemUpdate, error: vendorAItemUpdateError } = await vendorAClient
      .from('po_items')
      .update({ completed_quantity: 5 })
      .eq('id', itemA.id)
      .select('id')
    assert(!vendorAItemUpdateError, `Vendor A item update error: ${vendorAItemUpdateError?.message}`)
    assert(vendorAItemUpdate.length === 1, 'Vendor A should update their own item progress')

    // Test 10: Vendor A cannot update Vendor B's item progress
    const { data: itemB } = await admin
      .from('po_items')
      .select('id')
      .eq('po_id', poBId)
      .single()
    if (!itemB) throw new Error('itemB not found')

    const { data: vendorACrossItemUpdate, error: vendorACrossItemUpdateError } = await vendorAClient
      .from('po_items')
      .update({ completed_quantity: 10 })
      .eq('id', itemB.id)
      .select('id')
    assert(!vendorACrossItemUpdateError, 'Cross-vendor item update should not error')
    assert(vendorACrossItemUpdate.length === 0, 'Vendor A should not update Vendor B items')

    // Test 11: Owner can see all POs
    const { data: ownerPOs, error: ownerReadError } = await ownerClient
      .from('purchase_orders')
      .select('id')
    assert(!ownerReadError, `Owner read error: ${ownerReadError?.message}`)
    assert(
      ownerPOs && ownerPOs.length >= 2 && ownerPOs.some((po: { id: string }) => po.id === poAId) && ownerPOs.some((po: { id: string }) => po.id === poBId),
      'Owner should see all POs'
    )

    console.log('✅ All PO RLS tests passed')
  } finally {
    // Cleanup
    if (poAId) await admin.from('purchase_orders').delete().eq('id', poAId)
    if (poBId) await admin.from('purchase_orders').delete().eq('id', poBId)
    if (userAId) await admin.auth.admin.deleteUser(userAId)
    if (userBId) await admin.auth.admin.deleteUser(userBId)
    if (vendorAId) await admin.from('vendors').delete().eq('id', vendorAId)
    if (vendorBId) await admin.from('vendors').delete().eq('id', vendorBId)
  }
}

main().catch((error) => {
  console.error(`❌ PO RLS test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  console.error(error)
  process.exitCode = 1
})

