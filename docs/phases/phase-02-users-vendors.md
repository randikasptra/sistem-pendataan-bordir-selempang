# Phase 2 - Users & Vendors

Status: COMPLETED
Started at: 2026-07-29
Completed at: 2026-07-29

## Objective

Provide secure, responsive vendor and user management for internal staff.

## Scope

- [x] Vendor create, list, detail, update, and activation state for owner/admin.
- [x] Invite owner, admin, and vendor staff accounts through Supabase Auth.
- [x] Link vendor staff to `vendor_id` and permit `can_manage_users` only for admins.
- [x] Activate or deactivate accounts without deleting history.
- [x] Server-side authorization and vendor-isolated RLS.
- [x] Zod validation, empty, success, error, and confirmation-oriented UI states.

## Acceptance Criteria

- [x] Owner/admin can create and edit vendors.
- [x] Owner or permitted admin can invite internal and vendor-staff accounts.
- [x] Deactivation preserves records and blocks the account at server-side auth checks.
- [x] Vendor users cannot access management pages through server-side checks.
- [x] Vendor A cannot read or update Vendor B; verified in Cloud integration test.

## Files Changed

- `src/app/(app)/vendors/*` and `src/app/(app)/users/page.tsx`
- `src/app/actions/management.ts`, `src/lib/management-auth.ts`, and `src/lib/validation.ts`
- `supabase/migrations/004_phase_2_users_vendors_rls.sql`
- `scripts/test-rls.ts`

## Database Changes

- Added `current_user_can_manage_users()` helper.
- Restricted vendor table reads to internal users or the caller's own vendor.
- Restricted profile listing to user managers; vendors retain only their own profile.

## Verification

- [x] Lint: `npm run lint`
- [x] Type-check: `npm run type-check`
- [x] RLS integration: `npm run test:rls` (temporary Vendor B and Auth user cleaned up)
- [x] Production build: `npm run build`

## Decisions

- User creation sends Supabase invitations so recipients create their own passwords.
- Mutations use a service-role client only after server-side authorization; service credentials are never sent to the browser.
- Vendor deactivation is a reversible profile state rather than a destructive delete.

## Blockers

- None.

## Handoff / Next Step

- Phase 2 is complete. Stop before Phase 3.
