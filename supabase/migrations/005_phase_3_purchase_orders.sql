-- Phase 3: Purchase Orders Schema and RLS

-- Enum types
do $$ begin
create type public.po_status as enum (
  'DRAFT',
  'SENT',
  'ACCEPTED',
  'IN_PROGRESS',
  'RECONFIRMATION_REQUIRED',
  'WAITING_APPROVAL',
  'REVISION',
  'COMPLETED',
  'CANCELLED'
);
exception when duplicate_object then null; end $$;

do $$ begin
create type public.attachment_type as enum (
  'reference',
  'overlay',
  'preview',
  'vendor_result',
  'revision_annotation'
);
exception when duplicate_object then null; end $$;

do $$ begin
create type public.approval_status as enum (
  'pending',
  'approved',
  'revision_requested'
);
exception when duplicate_object then null; end $$;

-- Purchase Orders table
create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  status public.po_status not null default 'DRAFT',
  po_deadline timestamptz,
  version_number integer not null default 1,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint po_number_format check (po_number ~ '^\w+-\d{4}-\d{2}-\d{2}-\d{3}$'),
  constraint approved_requires_approved_at check ((approved_by is not null) = (approved_at is not null)),
  constraint cancelled_requires_cancelled_at check ((cancelled_by is not null) = (cancelled_at is not null))
);

create index idx_purchase_orders_vendor_id on public.purchase_orders(vendor_id);
create index idx_purchase_orders_status on public.purchase_orders(status);
create index idx_purchase_orders_created_at on public.purchase_orders(created_at desc);
create index idx_purchase_orders_po_number on public.purchase_orders(po_number);

-- PO Items table
create table if not exists public.po_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  title text not null,
  quantity integer not null check (quantity >= 1),
  completed_quantity integer not null default 0 check (completed_quantity >= 0),
  item_deadline timestamptz,
  specifications jsonb,
  notes text,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint completed_not_exceed_quantity check (completed_quantity <= quantity)
);

create index idx_po_items_po_id on public.po_items(po_id);
create index idx_po_items_sort_order on public.po_items(po_id, sort_order);

-- Attachments table
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid references public.po_items(id) on delete cascade,
  type public.attachment_type not null,
  storage_path text not null,
  mime_type text not null,
  original_name text not null,
  size_bytes bigint not null check (size_bytes > 0),
  uploaded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),

  constraint po_or_item_required check ((po_id is not null) or (item_id is not null))
);

create index idx_attachments_po_id on public.attachments(po_id);
create index idx_attachments_item_id on public.attachments(item_id);
create index idx_attachments_type on public.attachments(type);

-- Design Versions table
create table if not exists public.design_versions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.po_items(id) on delete cascade,
  version integer not null,
  canvas_json jsonb not null,
  preview_attachment_id uuid references public.attachments(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),

  unique(item_id, version)
);

create index idx_design_versions_item_id on public.design_versions(item_id);

-- Approval Requests table
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status public.approval_status not null default 'pending',
  vendor_note text,
  review_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,

  constraint reviewed_requires_reviewed_at check ((reviewed_by is not null) = (reviewed_at is not null))
);

create index idx_approval_requests_po_id on public.approval_requests(po_id);
create index idx_approval_requests_status on public.approval_requests(status);

-- Revision Notes table
create table if not exists public.revision_notes (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id uuid references public.po_items(id) on delete set null,
  note text not null,
  annotated_attachment_id uuid references public.attachments(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_revision_notes_po_id on public.revision_notes(po_id);
create index idx_revision_notes_item_id on public.revision_notes(item_id);

-- PO Versions table
create table if not exists public.po_versions (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.purchase_orders(id) on delete cascade,
  version_number integer not null,
  change_reason text not null,
  changed_fields jsonb not null,
  snapshot jsonb not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),

  unique(po_id, version_number)
);

create index idx_po_versions_po_id on public.po_versions(po_id);

-- Activity Logs table (append-only)
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  po_id uuid references public.purchase_orders(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_po_id on public.activity_logs(po_id);
create index idx_activity_logs_actor_id on public.activity_logs(actor_id);
create index idx_activity_logs_created_at on public.activity_logs(created_at desc);

-- Notifications table
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_read_at on public.notifications(user_id, read_at);
create index idx_notifications_created_at on public.notifications(created_at desc);

-- Sequence for atomic PO number generation per day
create sequence if not exists po_number_sequence start with 1 increment by 1;

-- Function to generate atomic PO number (PO-YYYY-MM-DD-NNN)
create or replace function public.generate_po_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_sequence int;
  v_po_number text;
begin
  -- Get next sequence value
  v_sequence := nextval('public.po_number_sequence');

  -- Format: PO-YYYY-MM-DD-NNN
  v_po_number := format('PO-%s-%03s', to_char(v_today, 'YYYY-MM-DD'), v_sequence);

  return v_po_number;
end;
$$;

grant execute on function public.generate_po_number() to authenticated, service_role;

-- Update purchase_orders to use trigger for atomic number assignment
create or replace function public.assign_po_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.po_number is null then
    new.po_number := public.generate_po_number();
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_assign_po_number on public.purchase_orders;
create trigger trigger_assign_po_number
before insert on public.purchase_orders
for each row
execute function public.assign_po_number();

-- Update timestamps trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trigger_purchase_orders_updated_at on public.purchase_orders;
create trigger trigger_purchase_orders_updated_at
before update on public.purchase_orders
for each row
execute function public.update_updated_at_column();

drop trigger if exists trigger_po_items_updated_at on public.po_items;
create trigger trigger_po_items_updated_at
before update on public.po_items
for each row
execute function public.update_updated_at_column();

-- RLS Policies

-- Enable RLS
alter table public.purchase_orders enable row level security;
alter table public.po_items enable row level security;
alter table public.attachments enable row level security;
alter table public.design_versions enable row level security;
alter table public.approval_requests enable row level security;
alter table public.revision_notes enable row level security;
alter table public.po_versions enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Purchase Orders RLS

-- Owner/Admin can see all POs
create policy "internal_users_see_all_pos" on public.purchase_orders for select
using (public.current_user_role() in ('owner', 'admin'));

-- Vendor can only see POs for their vendor
create policy "vendor_see_own_pos" on public.purchase_orders for select
using (
  public.current_user_role() = 'vendor'
  and vendor_id = public.current_user_vendor_id()
);

-- Only owner/admin can create POs
create policy "internal_users_create_pos" on public.purchase_orders for insert
with check (
  public.current_user_role() in ('owner', 'admin')
  and created_by = auth.uid()
);

-- Only owner/admin can update their own draft POs or sent POs
create policy "internal_users_update_own_pos" on public.purchase_orders for update
using (
  public.current_user_role() in ('owner', 'admin')
  and created_by = auth.uid()
  and status in ('DRAFT', 'SENT', 'ACCEPTED', 'IN_PROGRESS', 'RECONFIRMATION_REQUIRED')
);

-- Vendor can only update progress on their POs
create policy "vendor_update_own_po_progress" on public.purchase_orders for update
using (
  public.current_user_role() = 'vendor'
  and vendor_id = public.current_user_vendor_id()
  and status in ('SENT', 'ACCEPTED', 'IN_PROGRESS', 'REVISION')
)
with check (
  public.current_user_role() = 'vendor'
  and vendor_id = public.current_user_vendor_id()
  and status in ('ACCEPTED', 'IN_PROGRESS', 'REVISION')
);

-- PO Items RLS

-- Same visibility as PO
create policy "internal_users_see_all_items" on public.po_items for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = po_items.po_id
    and public.current_user_role() in ('owner', 'admin')
  )
);

create policy "vendor_see_own_items" on public.po_items for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = po_items.po_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Only internal users can modify items in their own POs
create policy "internal_users_manage_items" on public.po_items for all
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = po_items.po_id
    and public.current_user_role() in ('owner', 'admin')
    and po.created_by = auth.uid()
  )
);

-- Vendor can only update completed_quantity and notes
create policy "vendor_update_item_progress" on public.po_items for update
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = po_items.po_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
    and po.status in ('ACCEPTED', 'IN_PROGRESS', 'REVISION')
  )
)
with check (
  exists (
    select 1 from public.purchase_orders po
    where po.id = po_items.po_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
    and po.status in ('ACCEPTED', 'IN_PROGRESS', 'REVISION')
  )
);

-- Attachments RLS
create policy "internal_users_see_all_attachments" on public.attachments for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = attachments.po_id
    and public.current_user_role() in ('owner', 'admin')
  )
  or
  exists (
    select 1 from public.po_items pi
    join public.purchase_orders po on po.id = pi.po_id
    where pi.id = attachments.item_id
    and public.current_user_role() in ('owner', 'admin')
  )
);

create policy "vendor_see_own_attachments" on public.attachments for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = attachments.po_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
  or
  exists (
    select 1 from public.po_items pi
    join public.purchase_orders po on po.id = pi.po_id
    where pi.id = attachments.item_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Only internal users can create attachments for their POs
create policy "internal_users_create_attachments" on public.attachments for insert
with check (
  public.current_user_role() in ('owner', 'admin')
  and uploaded_by = auth.uid()
  and exists (
    select 1 from public.purchase_orders po
    where po.id = attachments.po_id
    and po.created_by = auth.uid()
  )
);

-- Vendor can upload result photos to their own POs
create policy "vendor_upload_result_photos" on public.attachments for insert
with check (
  public.current_user_role() = 'vendor'
  and uploaded_by = auth.uid()
  and type = 'vendor_result'
  and exists (
    select 1 from public.purchase_orders po
    where po.id = attachments.po_id
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Design Versions RLS
create policy "internal_users_manage_designs" on public.design_versions for all
using (
  exists (
    select 1 from public.po_items pi
    join public.purchase_orders po on po.id = pi.po_id
    where pi.id = design_versions.item_id
    and public.current_user_role() in ('owner', 'admin')
    and po.created_by = auth.uid()
  )
);

create policy "vendor_see_designs" on public.design_versions for select
using (
  exists (
    select 1 from public.po_items pi
    join public.purchase_orders po on po.id = pi.po_id
    where pi.id = design_versions.item_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Approval Requests RLS
create policy "internal_users_see_all_approvals" on public.approval_requests for select
using (public.current_user_role() in ('owner', 'admin'));

create policy "vendor_see_own_approval_requests" on public.approval_requests for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = approval_requests.po_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Revision Notes RLS (same as approval requests)
create policy "internal_users_see_all_revisions" on public.revision_notes for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = revision_notes.po_id
    and public.current_user_role() in ('owner', 'admin')
  )
);

create policy "vendor_see_own_revisions" on public.revision_notes for select
using (
  exists (
    select 1 from public.purchase_orders po
    where po.id = revision_notes.po_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Activity Logs RLS
create policy "internal_users_see_all_logs" on public.activity_logs for select
using (public.current_user_role() in ('owner', 'admin'));

create policy "vendor_see_own_logs" on public.activity_logs for select
using (
  public.current_user_role() = 'vendor'
  and exists (
    select 1 from public.purchase_orders po
    where po.id = activity_logs.po_id
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Only system (via server) can insert activity logs
create policy "system_insert_logs" on public.activity_logs for insert
with check (true);

-- Notifications RLS
create policy "see_own_notifications" on public.notifications for select
using (user_id = auth.uid());

create policy "system_create_notifications" on public.notifications for insert
with check (true);

create policy "mark_own_as_read" on public.notifications for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Grant access
grant usage on schema public to authenticated, service_role;
grant select, insert, update on public.purchase_orders to authenticated, service_role;
grant select, insert, update on public.po_items to authenticated, service_role;
grant select, insert, update on public.attachments to authenticated, service_role;
grant select, insert, update on public.design_versions to authenticated, service_role;
grant select, insert, update on public.approval_requests to authenticated, service_role;
grant select, insert on public.revision_notes to authenticated, service_role;
grant select on public.po_versions to authenticated, service_role;
grant select, insert on public.activity_logs to authenticated, service_role;
grant select, insert, update on public.notifications to authenticated, service_role;
