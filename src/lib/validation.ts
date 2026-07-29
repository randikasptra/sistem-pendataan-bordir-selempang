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
