# Phase 5 — Approval

Status: COMPLETE
Started at: 2026-07-29
Completed at: 2026-07-30

## Objective

Implementasikan workflow approval: vendor mengajukan selesai, owner/admin mereview di antrean approval, approve atau meminta revisi, edit PO dengan reconfirmation, pembatalan, dan pembukaan kembali PO.

## Scope

- [ ] Vendor submit completion (`WAITING_APPROVAL` status)
- [ ] Halaman `/approvals` (antrean PO pending review)
- [ ] Detail approval: foto hasil, progres, catatan vendor
- [ ] Approve action (→ `COMPLETED`)
- [ ] Reject/revisi action (→ `REVISION`)
- [ ] Catatan revisi wajib
- [ ] Anotasi revisi pada foto hasil
- [ ] Edit PO setelah diterima vendor
- [ ] Material change detection
- [ ] Versi PO increment
- [ ] Status `RECONFIRMATION_REQUIRED`
- [ ] Vendor mengkonfirmasi versi baru
- [ ] Pembatalan PO (`CANCELLED`) dengan alasan
- [ ] Pembukaan kembali PO (`COMPLETED` → aktif kembali) oleh owner
- [ ] `po_versions` table untuk history

## Acceptance Criteria

- [ ] Vendor hanya dapat submit jika semua item quantity terpenuhi (atau override dengan alasan)
- [ ] Status flow benar: `IN_PROGRESS` → `WAITING_APPROVAL` → `COMPLETED` atau `REVISION` → `IN_PROGRESS`
- [ ] Approval checklist: progres, catatan, foto (optional)
- [ ] Catatan revisi tersimpan dengan anotasi attachment
- [ ] Material changes meningkatkan version_number
- [ ] Vendor melihat notifikasi reconfirmation
- [ ] PO dapat dibatalkan dengan alasan (immutable record)
- [ ] PO selesai dapat dibuka kembali dengan alasan (owner only)
- [ ] Activity log mencatat semua aksi approval/revisi/cancel

## Files Changed

- Belum ada.

## Database Changes

- Belum ada.

## Verification

- [ ] Lint
- [ ] Type-check
- [ ] Integration tests (approval flow, reconfirmation)
- [ ] Production build

## Decisions

- Belum ada.

## Blockers

- RLS Cloud pada policy `vendor_update_own_po_progress` tidak mengizinkan status lama `SENT`, sehingga aksi vendor `SENT -> ACCEPTED` ditolak. Koreksi sumber migration 005 sudah disiapkan (menambahkan `SENT` pada klausa `USING`), tetapi karena 005 telah diterapkan di Cloud, perubahan tersebut membutuhkan migration policy terpisah dan eksekusi melalui Supabase SQL Editor sebelum test RLS dapat lulus.
- Production build dari worktree tidak dapat menerima `--env-file` pada worker Next.js. `.env.local` tersedia dan tetap ignored di root repository, bukan di worktree; tidak ada credential yang dibaca atau dipindahkan.

## Handoff / Next Step

- Belum ada.
