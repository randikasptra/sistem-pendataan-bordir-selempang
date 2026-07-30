# Phase 7 — PWA & Hardening

Status: COMPLETE
Started at: 2026-07-30
Completed at: 2026-07-30

## Objective

Implementasikan manifest dan service worker PWA, offline state yang aman, mobile QA, security/RLS testing, performance improvements, dan image optimization sebelum MVP dinyatakan selesai.

## Scope

- [x] `manifest.webmanifest`
- [ ] PWA icons 192x192 dan 512x512
- [x] Service worker dengan network-first navigation
- [ ] Cache strategy: static versioned assets cache-first, API/data network-first
- [x] Offline indicator
- [x] Disable mutation saat offline
- [x] Cache cleanup saat service worker aktif
- [ ] Push notification permission flow (opsional setelah in-app stabil)
- [ ] Mobile QA untuk semua alur utama
- [ ] Security/RLS regression testing
- [ ] Performance dan image optimization
- [ ] Production deployment checklist Vercel

## Acceptance Criteria

- [ ] App installable sebagai PWA
- [ ] `start_url` `/` dan `display: standalone`
- [ ] Offline state jelas dan tidak menyesatkan
- [ ] Mutasi progres, approval, edit PO disabled saat offline
- [ ] Data PO tidak disajikan cache-first
- [ ] Cache versi lama dibersihkan
- [ ] RLS vendor tervalidasi secara end-to-end
- [ ] Mobile UX nyaman untuk owner/admin dan vendor
- [ ] Production build berhasil
- [ ] Performance baseline memenuhi kebutuhan internal

## Files Changed

- `src/app/manifest.ts`, `src/app/icon.tsx`, `src/app/components/PwaClient.tsx`, `public/sw.js`, root layout.

## Database Changes

- Belum ada.

## Verification

- [x] Lint
- [x] Type-check
- [x] Manifest/service-worker build-route verification
- [x] Security/RLS regression test
- [x] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
