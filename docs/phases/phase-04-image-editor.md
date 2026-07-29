# Phase 4 — Image Editor

Status: NOT_STARTED
Started at:
Completed at:

## Objective

Implementasikan Supabase Storage policy, upload dan kompresi gambar, Fabric.js editor dengan full annotation capabilities, canvas JSON dan design version management, preview WebP/PNG, serta anotasi revisi untuk foto hasil vendor.

## Scope

- [ ] Supabase Storage bucket dan RLS policy
- [ ] Upload gambar referensi, logo, foto hasil vendor
- [ ] Kompresi dan thumbnail generation
- [ ] Fabric.js editor integration (dynamic import)
- [ ] Freehand brush, warna, ketebalan
- [ ] Teks, garis, panah, kotak, lingkaran, tanda silang
- [ ] Upload gambar/logo sebagai layer
- [ ] Drag, resize, rotate, duplicate, reorder, delete layer
- [ ] Undo/redo
- [ ] Zoom dan reset view
- [ ] Preview sebelum simpan
- [ ] Export ke WebP/PNG
- [ ] Canvas JSON save/load
- [ ] Design version tracking
- [ ] Anotasi revisi pada foto hasil vendor
- [ ] Halaman editor `/po/[id]/edit-design`

## Acceptance Criteria

- [ ] Upload gambar reference berhasil
- [ ] Editor Fabric.js terbuka di client-side
- [ ] Semua tools di 10.1 berfungsi
- [ ] Canvas JSON dapat disimpan dan dimuat ulang
- [ ] Gambar asli immutable (tidak ditimpa)
- [ ] Preview WebP/PNG dapat didownload
- [ ] Kompresi gambar tidak hilang kualitas signifikan
- [ ] Storage signed URL aman
- [ ] Vendor hanya bisa upload foto hasil ke path PO miliknya
- [ ] Anotasi revisi dapat dibuat dari foto hasil
- [ ] Memory usage dibatasi di HP

## Files Changed

- Belum ada.

## Database Changes

- Belum ada.

## Verification

- [ ] Lint
- [ ] Type-check
- [ ] Component tests (editor features)
- [ ] E2E tests (upload, annotate, save, reopen)
- [ ] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
