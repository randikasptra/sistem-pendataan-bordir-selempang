# Phase 2 — Users & Vendors

Status: NOT_STARTED
Started at:
Completed at:

## Objective

Implementasikan sistem manajemen user dan vendor. Owner dapat membuat/mengedit user internal (admin/vendor staff) dan vendor. RLS dasar diterapkan untuk membatasi akses per role.

## Scope

- [ ] CRUD vendor (owner/admin)
- [ ] Halaman `/vendors` dan `/vendors/[id]`
- [ ] CRUD user (owner dengan optional permission untuk admin)
- [ ] Halaman `/users`
- [ ] User activation/deactivation
- [ ] Hubungan user dengan vendor
- [ ] RLS dasar untuk profiles dan vendors
- [ ] Validasi Zod untuk form input

## Acceptance Criteria

- [ ] Owner dapat membuat vendor baru
- [ ] Owner dapat mengedit vendor
- [ ] Owner dapat membuat user baru (owner/admin/vendor)
- [ ] User yang dibuat mendapat email activation (Supabase Auth)
- [ ] Admin dengan permission dapat mengelola user
- [ ] User dapat dideaktifkan tanpa menghapus data
- [ ] Vendor hanya dapat melihat user sendiri
- [ ] RLS vendor_id tervalidasi: vendor A tidak dapat membaca vendor B

## Files Changed

- Belum ada.

## Database Changes

- Belum ada.

## Verification

- [ ] Lint
- [ ] Type-check
- [ ] Integration tests (RLS)
- [ ] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
