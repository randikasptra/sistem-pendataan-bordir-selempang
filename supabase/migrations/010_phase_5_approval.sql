-- Phase 5 approval metadata. annotated_attachment_id intentionally stays
-- nullable so this workflow works with or without a Phase 4 annotation.
alter table public.purchase_orders add column if not exists reopened_by uuid references public.profiles(id) on delete set null;
alter table public.purchase_orders add column if not exists reopened_at timestamptz;
alter table public.purchase_orders add column if not exists reopen_reason text;

grant select, insert, update on public.approval_requests, public.revision_notes, public.po_versions to authenticated, service_role;
create policy "phase5_vendor_create_approval" on public.approval_requests for insert with check (requested_by = auth.uid() and exists (select 1 from public.purchase_orders po where po.id = po_id and po.vendor_id = public.current_user_vendor_id()));
create policy "phase5_internal_update_approval" on public.approval_requests for update using (public.current_user_role() in ('owner','admin'));
create policy "phase5_internal_create_revision" on public.revision_notes for insert with check (public.current_user_role() in ('owner','admin') and created_by = auth.uid());
create policy "phase5_internal_create_version" on public.po_versions for insert with check (public.current_user_role() in ('owner','admin') and created_by = auth.uid());
