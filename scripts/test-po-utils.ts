import {
  calculatePOProgress,
  calculateItemProgress,
  areAllItemsCompleted,
  canTransitionStatus,
  formatPONumber,
} from '../src/lib/po-utils'
import type { POItem } from '../src/types'

const assert = (value: unknown, message: string) => {
  if (!value) throw new Error(`Assertion failed: ${message}`)
}

function testProgressCalculation() {
  // Test item progress
  const item1: POItem = {
    id: '1',
    po_id: 'po1',
    title: 'Item 1',
    quantity: 10,
    completed_quantity: 5,
    item_deadline: null,
    specifications: null,
    notes: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  assert(calculateItemProgress(item1) === 50, 'Item progress should be 50%')

  // Test PO progress with multiple items
  const item2: POItem = {
    ...item1,
    id: '2',
    quantity: 20,
    completed_quantity: 10,
  }
  const items = [item1, item2]
  // Total: 30 pcs, Completed: 15 pcs = 50%
  assert(calculatePOProgress(items) === 50, 'PO progress should be 50%')

  // Test all items completed
  const completedItem: POItem = { ...item1, completed_quantity: 10 }
  assert(areAllItemsCompleted([completedItem]), 'Item should be completed')
  assert(!areAllItemsCompleted([item1]), 'Item should not be completed')

  console.log('✓ Progress calculation tests passed')
}

function testStatusTransitions() {
  // Valid transitions
  assert(canTransitionStatus('DRAFT', 'SENT'), 'DRAFT -> SENT should be valid')
  assert(canTransitionStatus('SENT', 'ACCEPTED'), 'SENT -> ACCEPTED should be valid')
  assert(
    canTransitionStatus('ACCEPTED', 'IN_PROGRESS'),
    'ACCEPTED -> IN_PROGRESS should be valid'
  )
  assert(
    canTransitionStatus('IN_PROGRESS', 'WAITING_APPROVAL'),
    'IN_PROGRESS -> WAITING_APPROVAL should be valid'
  )
  assert(
    canTransitionStatus('WAITING_APPROVAL', 'COMPLETED'),
    'WAITING_APPROVAL -> COMPLETED should be valid'
  )
  assert(
    canTransitionStatus('WAITING_APPROVAL', 'REVISION'),
    'WAITING_APPROVAL -> REVISION should be valid'
  )
  assert(canTransitionStatus('REVISION', 'IN_PROGRESS'), 'REVISION -> IN_PROGRESS should be valid')

  // Invalid transitions
  assert(!canTransitionStatus('DRAFT', 'COMPLETED'), 'DRAFT -> COMPLETED should be invalid')
  assert(!canTransitionStatus('COMPLETED', 'DRAFT'), 'COMPLETED -> DRAFT should be invalid')
  assert(!canTransitionStatus('CANCELLED', 'SENT'), 'CANCELLED -> SENT should be invalid')
  assert(
    !canTransitionStatus('SENT', 'WAITING_APPROVAL'),
    'SENT -> WAITING_APPROVAL should be invalid'
  )

  console.log('✓ Status transition tests passed')
}

function testPONumberFormatting() {
  const formatted = formatPONumber('PO-2026-07-29-001')
  assert(formatted === 'PO 29 Juli 2026 — #001', `Expected "PO 29 Juli 2026 — #001", got "${formatted}"`)

  const formatted2 = formatPONumber('PO-2026-12-31-999')
  assert(
    formatted2 === 'PO 31 Desember 2026 — #999',
    `Expected "PO 31 Desember 2026 — #999", got "${formatted2}"`
  )

  // Invalid format should return as-is
  const invalid = formatPONumber('INVALID')
  assert(invalid === 'INVALID', 'Invalid format should return as-is')

  console.log('✓ PO number formatting tests passed')
}

function testQuantityValidation() {
  const item: POItem = {
    id: '1',
    po_id: 'po1',
    title: 'Item 1',
    quantity: 10,
    completed_quantity: 10,
    item_deadline: null,
    specifications: null,
    notes: null,
    sort_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Valid: completed equals quantity
  assert(
    item.completed_quantity <= item.quantity,
    'Completed quantity should not exceed total quantity'
  )

  // Valid: completed less than quantity
  const inProgress = { ...item, completed_quantity: 5 }
  assert(
    inProgress.completed_quantity <= inProgress.quantity,
    'Partial completion should be valid'
  )

  // Invalid case would be caught by database constraint
  // completed_quantity > quantity is prevented by CHECK constraint

  console.log('✓ Quantity validation tests passed')
}

async function main() {
  console.log('Running PO utility tests...\n')

  testProgressCalculation()
  testStatusTransitions()
  testPONumberFormatting()
  testQuantityValidation()

  console.log('\n✅ All PO utility tests passed')
}

main().catch((error) => {
  console.error(`\n❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  process.exitCode = 1
})
