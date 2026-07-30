# Phase 6 — Notifications & WhatsApp

Status: COMPLETE
Started at: 2026-07-30
Completed at: 2026-07-30

## Objective

Implementasikan in-app notifications dengan unread badge, trigger notifikasi untuk berbagai state PO, serta sharing ringkasan PO ke WhatsApp dengan deep link.

## Scope

- [ ] Schema `notifications`
- [ ] In-app notification provider & component
- [ ] Notification triggers (PO sent, accepted, reconfirmation, deadline H-1, deadline overdue, waiting approval, revision, completed, cancelled)
- [ ] Unread status & Mark all as read
- [ ] Deep links from notification to detail PO
- [ ] Copy PO summary text
- [ ] WhatsApp share button with formatting
- [ ] Deep link route handler

## Acceptance Criteria

- [ ] Notifikasi masuk ke database sesuai trigger
- [ ] User vendor menerima notifikasi PO baru, rekonfirmasi, revisi, approval
- [ ] Owner/admin menerima notifikasi PO diterima, waiting approval, deadline overdue
- [ ] Badge unread berubah secara realtime/refresh
- [ ] Deep link mengarahkan pengguna ke halaman target setelah login
- [ ] WhatsApp share memformat teks ringkasan dengan benar (PO number, vendor, total, deadline, link)

## Files Changed

- `src/app/(app)/notifications/page.tsx`, `src/app/actions/notifications.ts`, notification navigation, migration 013--015, and deadline smoke test.

## Database Changes

- Workflow notification trigger, deadline notification function, and PO-number generator correction.

## Verification

- [x] Lint
- [x] Type-check
- [x] Deadline notification + RLS smoke tests
- [x] Production build

## Decisions

- Belum ada.

## Blockers

- Tidak ada.

## Handoff / Next Step

- Belum ada.
