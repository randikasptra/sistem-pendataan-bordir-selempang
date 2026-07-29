-- Avoid recursive RLS evaluation when a policy needs the current user's role
-- or vendor. These helpers execute as the migration owner and expose only the
-- caller's own scalar values.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.current_user_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vendor_id from public.profiles where id = auth.uid()
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.current_user_vendor_id() from public;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.current_user_vendor_id() to authenticated, service_role;

drop policy if exists "owner_see_all_profiles" on public.profiles;
create policy "owner_see_all_profiles" on public.profiles for select
using (public.current_user_role() = 'owner');

drop policy if exists "admin_see_all_profiles" on public.profiles;
create policy "admin_see_all_profiles" on public.profiles for select
using (public.current_user_role() = 'admin');

drop policy if exists "vendor_see_same_vendor_profiles" on public.profiles;
create policy "vendor_see_same_vendor_profiles" on public.profiles for select
using (
  public.current_user_role() = 'vendor'
  and vendor_id = public.current_user_vendor_id()
);

drop policy if exists "owner_admin_modify_vendors" on public.vendors;
create policy "owner_admin_modify_vendors" on public.vendors for insert
with check (public.current_user_role() in ('owner', 'admin'));

drop policy if exists "owner_admin_update_vendors" on public.vendors;
create policy "owner_admin_update_vendors" on public.vendors for update
using (public.current_user_role() in ('owner', 'admin'));
