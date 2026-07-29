import type { POItem, POStatus } from '@/types'

/**
 * Calculate progress percentage for a PO based on completed vs total quantity
 */
export function calculatePOProgress(items: POItem[]): number {
  if (!items.length) return 0

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
  const completedQuantity = items.reduce((sum, item) => sum + item.completed_quantity, 0)

  if (totalQuantity === 0) return 0

  return Math.round((completedQuantity / totalQuantity) * 100)
}

/**
 * Calculate progress percentage for a single item
 */
export function calculateItemProgress(item: POItem): number {
  if (item.quantity === 0) return 0
  return Math.round((item.completed_quantity / item.quantity) * 100)
}

/**
 * Check if all items in a PO are completed
 */
export function areAllItemsCompleted(items: POItem[]): boolean {
  if (!items.length) return false
  return items.every(item => item.completed_quantity >= item.quantity)
}

/**
 * Validate status transition
 */
export function canTransitionStatus(from: POStatus, to: POStatus): boolean {
  const validTransitions: Record<POStatus, POStatus[]> = {
    DRAFT: ['SENT'],
    SENT: ['ACCEPTED', 'CANCELLED'],
    ACCEPTED: ['IN_PROGRESS', 'RECONFIRMATION_REQUIRED', 'CANCELLED'],
    IN_PROGRESS: ['WAITING_APPROVAL', 'RECONFIRMATION_REQUIRED', 'CANCELLED'],
    RECONFIRMATION_REQUIRED: ['IN_PROGRESS', 'CANCELLED'],
    WAITING_APPROVAL: ['COMPLETED', 'REVISION', 'CANCELLED'],
    REVISION: ['IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [], // Can be reopened only by owner with special action
    CANCELLED: [], // Terminal state
  }

  return validTransitions[from]?.includes(to) ?? false
}

/**
 * Check if a PO can be edited by admin (based on status)
 */
export function canEditPO(status: POStatus): boolean {
  return ['DRAFT', 'SENT', 'ACCEPTED'].includes(status)
}

/**
 * Check if editing a PO requires reconfirmation (material change after acceptance)
 */
export function requiresReconfirmation(status: POStatus): boolean {
  return ['ACCEPTED', 'IN_PROGRESS'].includes(status)
}

/**
 * Check if vendor can update progress on a PO
 */
export function vendorCanUpdateProgress(status: POStatus): boolean {
  return ['ACCEPTED', 'IN_PROGRESS', 'REVISION'].includes(status)
}

/**
 * Check if vendor can submit for approval
 */
export function vendorCanSubmitApproval(status: POStatus, allCompleted: boolean): boolean {
  return status === 'IN_PROGRESS' && allCompleted
}

/**
 * Format PO number for display
 * PO-2026-07-29-001 -> PO 29 Juli 2026 — #001
 */
export function formatPONumber(poNumber: string): string {
  const match = poNumber.match(/^PO-(\d{4})-(\d{2})-(\d{2})-(\d{3})$/)
  if (!match) return poNumber

  const [, year, month, day, seq] = match

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const monthName = months[parseInt(month, 10) - 1]

  return `PO ${parseInt(day, 10)} ${monthName} ${year} — #${seq}`
}

/**
 * Format date for Indonesian locale
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Format datetime for Indonesian locale
 */
export function formatDateTime(dateString: string | null): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Check if a deadline is overdue
 */
export function isOverdue(deadline: string | null): boolean {
  if (!deadline) return false
  return new Date(deadline) < new Date()
}

/**
 * Check if a deadline is approaching (within 24 hours)
 */
export function isApproaching(deadline: string | null): boolean {
  if (!deadline) return false
  const diff = new Date(deadline).getTime() - Date.now()
  return diff > 0 && diff <= 24 * 60 * 60 * 1000
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: POStatus): string {
  const colors: Record<POStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    SENT: 'bg-blue-100 text-blue-700',
    ACCEPTED: 'bg-green-100 text-green-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
    RECONFIRMATION_REQUIRED: 'bg-orange-100 text-orange-700',
    WAITING_APPROVAL: 'bg-purple-100 text-purple-700',
    REVISION: 'bg-red-100 text-red-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    CANCELLED: 'bg-gray-100 text-gray-500',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

/**
 * Get status label in Indonesian
 */
export function getStatusLabel(status: POStatus): string {
  const labels: Record<POStatus, string> = {
    DRAFT: 'Draft',
    SENT: 'Terkirim',
    ACCEPTED: 'Diterima',
    IN_PROGRESS: 'Sedang Dikerjakan',
    RECONFIRMATION_REQUIRED: 'Perlu Konfirmasi Ulang',
    WAITING_APPROVAL: 'Menunggu Persetujuan',
    REVISION: 'Revisi',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  }
  return labels[status] || status
}
