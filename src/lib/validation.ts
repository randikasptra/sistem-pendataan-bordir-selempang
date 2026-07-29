import { z } from 'zod'

export const vendorSchema = z.object({
  code: z.string().trim().min(2).max(32).regex(/^[A-Z0-9-]+$/),
  name: z.string().trim().min(2).max(120),
  whatsapp: z.string().trim().max(32).optional(),
  notes: z.string().trim().max(1000).optional(),
})

export const managedUserSchema = z
  .object({
    email: z.string().trim().email(),
    fullName: z.string().trim().min(2).max(120),
    role: z.enum(['owner', 'admin', 'vendor']),
    vendorId: z.string().uuid().nullable(),
    canManageUsers: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.role === 'vendor' && !value.vendorId) {
      context.addIssue({ code: 'custom', path: ['vendorId'], message: 'Staf vendor wajib memilih vendor.' })
    }
    if (value.role !== 'vendor' && value.vendorId) {
      context.addIssue({ code: 'custom', path: ['vendorId'], message: 'Akun internal tidak boleh terhubung ke vendor.' })
    }
  })

export const poItemSchema = z.object({
  title: z.string().trim().min(2, 'Judul item minimal 2 karakter').max(200, 'Judul item maksimal 200 karakter'),
  quantity: z.number().int().min(1, 'Jumlah minimal 1 pcs'),
  item_deadline: z.string().datetime().nullable(),
  specifications: z.record(z.string(), z.unknown()).nullable().optional(),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
})

export const createPOSchema = z.object({
  vendor_id: z.string().uuid('Vendor tidak valid'),
  po_deadline: z.string().datetime().nullable(),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
  items: z.array(poItemSchema).min(1, 'PO harus memiliki minimal 1 item'),
})

export const updatePOSchema = z.object({
  po_deadline: z.string().datetime().nullable(),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
  items: z.array(
    poItemSchema.extend({
      id: z.string().uuid().optional(), // existing items have ID
    })
  ).min(1, 'PO harus memiliki minimal 1 item'),
})

export const updateItemProgressSchema = z.object({
  completed_quantity: z.number().int().min(0, 'Jumlah selesai tidak boleh negatif'),
  notes: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
}).refine(
  (data) => data.completed_quantity !== undefined,
  'Jumlah selesai wajib diisi'
)

export const cancelPOSchema = z.object({
  cancellation_reason: z.string().trim().min(10, 'Alasan pembatalan minimal 10 karakter').max(500, 'Alasan maksimal 500 karakter'),
})

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approve', 'revision']),
  review_note: z.string().trim().max(2000, 'Catatan maksimal 2000 karakter').optional(),
}).refine(
  (data) => data.decision !== 'revision' || (data.review_note && data.review_note.length >= 10),
  { message: 'Catatan revisi minimal 10 karakter', path: ['review_note'] }
)
