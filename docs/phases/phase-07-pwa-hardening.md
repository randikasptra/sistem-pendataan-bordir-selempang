# Phase 7 — PWA & Hardening

Status: NOT_STARTED
Started at:
Completed at:

## Objective

Implementasikan manifest dan service worker PWA, offline state yang aman, mobile QA, security/RLS testing, performance improvements, dan image optimization sebelum MVP dinyatakan selesai.

## Scope

- [ ] `manifest.webmanifest`
- [ ] PWA icons 192x192 dan 512x512
- [ ] Service worker dengan network-first navigation
- [ ] Cache strategy: static versioned assets cache-first, API/data network-first
- [ ] Offline indicator
- [ ] Disable mutation saat offline
- [ ] Cache cleanup saat service worker aktif
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

- Belum ada.

## Database Changes

- Belum ada.

## Verification

- [ ] Lint
- [ ] Type-check
- [ ] E2E tests
- [ ] PWA installability check
- [ ] Security/RLS tests
- [ ] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
