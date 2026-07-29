-- Create vendors table
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  whatsapp text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create profiles table (linked to auth.users and vendors)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'vendor' check (role in ('owner', 'admin', 'vendor')),
  vendor_id uuid references public.vendors(id) on delete set null,
  can_manage_users boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;

-- Recreate policies so this migration is safe to run again.
drop policy if exists "owner_see_all_profiles" on public.profiles;
create policy "owner_see_all_profiles" on public.profiles for select
using ((select role from public.profiles where id = auth.uid()) = 'owner');

drop policy if exists "admin_see_all_profiles" on public.profiles;
create policy "admin_see_all_profiles" on public.profiles for select
using ((select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "vendor_see_same_vendor_profiles" on public.profiles;
create policy "vendor_see_same_vendor_profiles" on public.profiles for select
using (
  (select role from public.profiles where id = auth.uid()) = 'vendor'
  and vendor_id = (select vendor_id from public.profiles where id = auth.uid())
);

drop policy if exists "users_see_own_profile" on public.profiles;
create policy "users_see_own_profile" on public.profiles for select
using (id = auth.uid());

drop policy if exists "anyone_read_vendors" on public.vendors;
create policy "anyone_read_vendors" on public.vendors for select using (true);

drop policy if exists "owner_admin_modify_vendors" on public.vendors;
create policy "owner_admin_modify_vendors" on public.vendors for insert
with check ((select role from public.profiles where id = auth.uid()) in ('owner', 'admin'));

drop policy if exists "owner_admin_update_vendors" on public.vendors;
create policy "owner_admin_update_vendors" on public.vendors for update
using ((select role from public.profiles where id = auth.uid()) in ('owner', 'admin'));
