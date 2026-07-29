# Project Instructions

## Source of Truth

- Read `PRD.md` before planning or implementing features.
- Read `docs/PROGRESS.md` to determine the current phase.
- Read the current file in `docs/phases/` before making changes.
- Record important technical decisions in `docs/DECISIONS.md`.

## Workflow

- Work on one phase at a time.
- Do not silently expand product scope.
- Preserve unrelated user changes.
- Update progress documents before ending every work session.
- A phase is not complete until its verification succeeds.
- Stop and ask for clarification when a missing decision materially changes product behavior.

## Quality Gate

- Run lint.
- Run TypeScript type-check.
- Run tests relevant to the phase.
- Run the production build.
- Report failures honestly and leave the phase as `BLOCKED` or `NEEDS_REVIEW`.

## Security

- Never expose Supabase service-role keys to the browser.
- Enforce authorization with Supabase RLS and server-side checks.
- Never rely only on hidden UI elements for access control.
