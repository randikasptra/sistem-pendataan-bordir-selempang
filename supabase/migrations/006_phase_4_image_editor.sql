-- Phase 4: Image Editor - Storage Policies and Bucket Setup

-- Storage bucket creation happens via Supabase UI or SDK
-- This migration sets up RLS policies for the buckets

-- Create attachments index for faster lookups by storage path
create index if not exists idx_attachments_storage_path on public.attachments(storage_path);

-- Policies for objects storage bucket (images, logos, etc.)
-- Enable RLS on storage.objects (if not already enabled)
-- Note: Storage RLS is configured at the bucket level via Supabase dashboard
-- These policies define who can access files

-- Policy: Owner/Admin can read all attachments and files
create policy "internal_users_read_all_attachments"
  on storage.objects for select
  using (
    bucket_id = 'po-attachments'
    and (
      auth.jwt() ->> 'role' = 'authenticated'
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role in ('owner', 'admin')
      )
    )
  );

-- Policy: Vendor can read only their PO attachments
create policy "vendor_read_own_po_attachments"
  on storage.objects for select
  using (
    bucket_id = 'po-attachments'
    and (
      auth.jwt() ->> 'role' = 'authenticated'
      and exists (
        select 1 from public.profiles p
        join public.attachments a on true
        where p.id = auth.uid()
        and p.role = 'vendor'
        and a.storage_path = storage.objects.name
        and exists (
          select 1 from public.purchase_orders po
          where po.id = a.po_id
          and po.vendor_id = p.vendor_id
        )
      )
    )
  );

-- Policy: Internal users can upload attachments to their own PO uploads
create policy "internal_users_upload_attachments"
  on storage.objects for insert
  with check (
    bucket_id = 'po-attachments'
    and (
      auth.jwt() ->> 'role' = 'authenticated'
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
        and role in ('owner', 'admin')
      )
    )
  );

-- Policy: Vendor can upload result photos to their PO path
create policy "vendor_upload_result_photos"
  on storage.objects for insert
  with check (
    bucket_id = 'po-attachments'
    and (
      auth.jwt() ->> 'role' = 'authenticated'
      and name like 'po/%/vendor-results/%'
      and exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
        and p.role = 'vendor'
      )
    )
  );

-- Function to get secure download URL with token
create or replace function public.get_attachment_signed_url(attachment_id uuid, expires_in_seconds int default 3600)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_storage_path text;
  v_current_user_id uuid;
  v_current_role text;
  v_vendor_id uuid;
begin
  v_current_user_id := auth.uid();
  v_current_role := (select role from profiles where id = v_current_user_id);
  v_vendor_id := (select vendor_id from profiles where id = v_current_user_id);

  -- Get attachment path and validate access
  select storage_path into v_storage_path
  from attachments a
  where a.id = attachment_id
  and (
    -- Owner/admin can access all
    v_current_role in ('owner', 'admin')
    or
    -- Vendor can access their own PO attachments
    (
      v_current_role = 'vendor'
      and exists (
        select 1 from purchase_orders po
        where po.id = a.po_id
        and po.vendor_id = v_vendor_id
      )
    )
  );

  if v_storage_path is null then
    raise exception 'Attachment not found or access denied';
  end if;

  -- Return signed URL (actual implementation handled by Supabase SDK)
  -- This is a placeholder; real implementation uses Supabase client
  return '/storage/v1/object/sign/po-attachments/' || v_storage_path;
end;
$$;

grant execute on function public.get_attachment_signed_url(uuid, int) to authenticated, service_role;

-- Table for storing Fabric.js canvas metadata (separate from design_versions which stores JSON)
create table if not exists public.canvas_metadata (
  id uuid primary key default gen_random_uuid(),
  design_version_id uuid not null references public.design_versions(id) on delete cascade,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  zoom_level numeric not null default 1.0 check (zoom_level > 0),
  background_color text default '#ffffff',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(design_version_id)
);

create index idx_canvas_metadata_design_version_id on public.canvas_metadata(design_version_id);

-- Enable RLS
alter table public.canvas_metadata enable row level security;

-- RLS policies for canvas metadata (same as design_versions access)
create policy "internal_users_manage_canvas_metadata" on public.canvas_metadata for all
using (
  exists (
    select 1 from public.po_items pi
    join public.purchase_orders po on po.id = pi.po_id
    join public.design_versions dv on dv.item_id = pi.id
    where dv.id = canvas_metadata.design_version_id
    and public.current_user_role() in ('owner', 'admin')
    and po.created_by = auth.uid()
  )
);

create policy "vendor_see_canvas_metadata" on public.canvas_metadata for select
using (
  exists (
    select 1 from public.po_items pi
    join public.purchase_orders po on po.id = pi.po_id
    join public.design_versions dv on dv.item_id = pi.id
    where dv.id = canvas_metadata.design_version_id
    and public.current_user_role() = 'vendor'
    and po.vendor_id = public.current_user_vendor_id()
  )
);

-- Grant access
grant select, insert, update on public.canvas_metadata to authenticated, service_role;
