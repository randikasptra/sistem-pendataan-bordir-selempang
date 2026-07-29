-- Allow Supabase API roles to reach Phase 1 tables. Row Level Security remains
-- enabled and continues to decide which rows authenticated users can access.
grant usage on schema public to anon, authenticated, service_role;

grant select on table public.vendors, public.profiles to authenticated;
grant insert, update on table public.vendors to authenticated;

-- Trusted server-side operations (seed and admin actions) use this role only.
grant all privileges on table public.vendors, public.profiles to service_role;
