create or replace function public.current_user_can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'owner' or (role = 'admin' and can_manage_users)
     from public.profiles where id = auth.uid()),
    false
  )
$$;

revoke all on function public.current_user_can_manage_users() from public;
grant execute on function public.current_user_can_manage_users() to authenticated, service_role;

drop policy if exists "owner_see_all_profiles" on public.profiles;
drop policy if exists "admin_see_all_profiles" on public.profiles;
drop policy if exists "vendor_see_same_vendor_profiles" on public.profiles;

create policy "managers_see_all_profiles" on public.profiles for select
using (public.current_user_can_manage_users());

drop policy if exists "anyone_read_vendors" on public.vendors;
create policy "internal_users_see_all_vendors" on public.vendors for select
using (public.current_user_role() in ('owner', 'admin'));

create policy "vendor_see_own_vendor" on public.vendors for select
using (
  public.current_user_role() = 'vendor'
  and id = public.current_user_vendor_id()
);

drop policy if exists "owner_admin_modify_vendors" on public.vendors;
create policy "internal_users_create_vendors" on public.vendors for insert
with check (public.current_user_role() in ('owner', 'admin'));

drop policy if exists "owner_admin_update_vendors" on public.vendors;
create policy "internal_users_update_vendors" on public.vendors for update
using (public.current_user_role() in ('owner', 'admin'));
