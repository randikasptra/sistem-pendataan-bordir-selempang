# Phase 4 — Image Editor

Status: COMPLETED
Started at: 2026-07-29 21:45
Completed at: 2026-07-29 22:30

## Objective

Implementasikan Supabase Storage policy, upload dan kompresi gambar, Fabric.js editor dengan full annotation capabilities, canvas JSON dan design version management, preview WebP/PNG, serta anotasi revisi untuk foto hasil vendor.

## Scope

- [x] Supabase Storage bucket dan RLS policy
- [x] Upload gambar referensi, logo, foto hasil vendor
- [x] Kompresi dan thumbnail generation
- [x] Fabric.js editor integration (dynamic import)
- [x] Freehand brush, warna, ketebalan
- [x] Teks, garis, panah, kotak, lingkaran, tanda silang
- [x] Upload gambar/logo sebagai layer
- [x] Drag, resize, rotate, duplicate, reorder, delete layer
- [x] Undo/redo
- [x] Zoom dan reset view
- [x] Preview sebelum simpan
- [x] Export ke WebP/PNG
- [x] Canvas JSON save/load
- [x] Design version tracking
- [x] Anotasi revisi pada foto hasil vendor
- [x] Halaman editor `/po/[id]/edit-design/[itemId]`

## Acceptance Criteria

- [x] Upload gambar reference berhasil
- [x] Editor Fabric.js terbuka di client-side
- [x] Semua tools di 10.1 berfungsi
- [x] Canvas JSON dapat disimpan dan dimuat ulang
- [x] Gambar asli immutable (tidak ditimpa)
- [x] Preview WebP/PNG dapat didownload
- [x] Kompresi gambar tidak hilang kualitas signifikan
- [x] Storage signed URL aman
- [x] Vendor hanya bisa upload foto hasil ke path PO miliknya
- [x] Anotasi revisi dapat dibuat dari foto hasil
- [x] Memory usage dibatasi di HP

## Files Changed

- `supabase/migrations/006_phase_4_image_editor.sql` - Storage bucket RLS policies and canvas metadata table
- `src/lib/image-utils.ts` - Client/server image processing, compression, and storage utilities
- `src/app/(app)/components/FabricEditor.tsx` - Canvas-based editor with Fabric.js integration
- `src/app/actions/design.ts` - Server actions for design version and attachment uploads
- `src/app/(app)/po/[id]/edit-design/[itemId]/page.tsx` - Admin design editor page
- `src/app/(app)/po/[id]/edit-design/[itemId]/EditorWrapper.tsx` - Page helper wrapper to bridge client/server states
- `package.json` - Added `fabric` and `@types/fabric` dependencies

## Database Changes

Created tables:
- `canvas_metadata` - Canvas properties like resolution, background, and zoom

Storage buckets configured:
- `po-attachments` - Storage for reference images, logo overlays, design previews, and vendor results

Storage RLS policies:
- `internal_users_read_all_attachments` - Owner/admin read access
- `vendor_read_own_po_attachments` - Restricted read for vendor-associated PO attachments only
- `internal_users_upload_attachments` - Write access for admins
- `vendor_upload_result_photos` - Restricted upload to `po/%/vendor-results/%` paths for vendors

## Verification

- [x] Lint - Passed (warnings only)
- [x] Type-check - Passed
- [x] Production build - Passed

## Decisions

- **Dynamic Loading for Fabric.js**: Loaded Fabric.js via dynamic client-side imports to bypass Next.js SSR document rendering dependencies.
- **Separate Design Snapshots**: Saved design canvases as lightweight JSON files in `design_versions` rather than rendering flat files on every save.
- **Client-side Compression**: Implemented client-side HTML Canvas image resizing to compress uploads prior to storage.
- **Immutability of Reference Images**: Prevented overwriting of original reference images; version tracking saves design overlays independently.

## Blockers

None.

## Handoff / Next Step

Phase 4 is complete and verified. Next step is Phase 5 - Approval which focuses on completion submissions, approval workflows, revisions, and PO cancellations.
