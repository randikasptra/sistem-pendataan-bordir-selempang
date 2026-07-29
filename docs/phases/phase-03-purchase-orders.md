# Phase 3 — Purchase Orders

Status: NOT_STARTED
Started at:
Completed at:

## Objective

Implementasikan schema PO dan item, generator nomor PO atomic, CRUD draft, pengiriman dan penerimaan PO, daftar/filter/detail, deadline dan progres, serta activity log.

## Scope

- [ ] Schema `purchase_orders` dan `po_items`
- [ ] Generator nomor PO (PO-YYYY-MM-DD-NNN) atomic
- [ ] CRUD PO (draft, edit, send)
- [ ] Halaman `/po` (list dengan filter, sort)
- [ ] Halaman `/po/new` (form kreator PO)
- [ ] Halaman `/po/[id]` (detail PO)
- [ ] Halaman `/po/[id]/edit` (edit PO setelah draft)
- [ ] Halaman `/po/[id]/history` (activity log)
- [ ] Vendor menerima PO (status SENT → ACCEPTED)
- [ ] Vendor dashboard `/vendor/po` (list PO milik vendor)
- [ ] Vendor detail `/vendor/po/[id]`
- [ ] Update `completed_quantity` per item
- [ ] Kalkulasi progres otomatis
- [ ] Deadline handling (PO deadline, item deadline)
- [ ] Activity log (create, send, accept, progress update)

## Acceptance Criteria

- [ ] Nomor PO unik berdasarkan tanggal dan urutan harian (atomic)
- [ ] PO hanya dapat ditujukan ke satu vendor
- [ ] Satu PO dapat berisi minimal dua item
- [ ] Item mempunyai quantity, completed_quantity, deadline
- [ ] `completed_quantity <= quantity`
- [ ] Progres PO = sum(completed_quantity) / sum(quantity)
- [ ] Vendor hanya melihat PO milik vendor sendiri
- [ ] Vendor dapat update progres per item
- [ ] Status flow benar: DRAFT → SENT → ACCEPTED → IN_PROGRESS
- [ ] Activity log mencatat actor, waktu, action, metadata
- [ ] RLS vendor tervalidasi di integration test

## Files Changed

- Belum ada.

## Database Changes

- Belum ada.

## Verification

- [ ] Lint
- [ ] Type-check
- [ ] Unit tests (PO number generator, progress calc)
- [ ] Integration tests (create/send/accept PO, RLS)
- [ ] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
