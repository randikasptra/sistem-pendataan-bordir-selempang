# Phase 1 - Foundation

Status: COMPLETED
Started at: 2026-07-29
Completed at: 2026-07-29

## Objective

Build the technical foundation: Next.js App Router with TypeScript strict mode, Tailwind CSS, Supabase integration, role-based authentication, responsive layouts, and Cloud-verified development seed data.

## Scope

- [x] Next.js + TypeScript + Tailwind initialization
- [x] Zod environment validation
- [x] Supabase client, server, and trusted admin wrappers
- [x] Auth, protected routes, and role-based access
- [x] Responsive desktop/mobile layout
- [x] Login and forgot-password pages
- [x] Root redirect by role
- [x] Initial schema and idempotent development Auth seed

## Acceptance Criteria

- [x] Lint, strict type-check, and production build pass.
- [x] Supabase Cloud migration and API privileges are applied.
- [x] Owner, admin, and vendor development accounts are seeded idempotently.
- [x] Owner/admin redirect to `/dashboard`; vendor redirects to `/vendor/dashboard`.
- [x] Vendor cannot open the internal dashboard; owner/admin cannot open the vendor dashboard.
- [x] Profiles RLS prevents a vendor from reading profiles outside its vendor scope.

## Files Changed

- `src/lib/env.ts`, `src/lib/supabase/*`, `src/lib/auth.ts`
- `src/proxy.ts`, `src/app/actions/auth.ts`, and Phase 1 app pages/layouts
- `scripts/seed-auth.ts` and `scripts/smoke-auth.ts`
- `.env.example` and `package.json`

## Database Changes

- `001_init_schema.sql`: `vendors` and `profiles` with idempotent policies.
- `002_grant_phase_1_api_access.sql`: minimum API privileges while retaining RLS.
- `003_fix_profiles_rls_recursion.sql`: scalar `SECURITY DEFINER` helpers to avoid recursive policies.
- `seed-auth.ts` upserts vendor `GRADMINE`, three Auth users, and their matching profiles.

## Verification

- [x] Lint: `npm run lint`
- [x] Type-check: `npm run type-check`
- [x] Smoke test: `npm run seed:auth` (rerun idempotently) and `npm run smoke:auth`
- [x] Production build: `npm run build`

## Decisions

- Use `proxy.ts` for session refresh and optimistic redirects, matching the Next.js 16 convention.
- Keep service-role access server-only; seed reads all account email/password values only from environment.
- Use scalar `SECURITY DEFINER` helpers for policy role/vendor lookup so RLS cannot recursively evaluate `profiles`.

## Blockers

- None.

## Handoff / Next Step

- Phase 1 is complete and verified against Supabase Cloud.
- Start Phase 2 - Users & Vendors after this Phase 1 commit is pushed.
