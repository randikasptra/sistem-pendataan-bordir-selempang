-- Phase 6: durable workflow notifications. Does not change RLS policies.
create or replace function public.notify_po_workflow_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = old.status then return new; end if;
  if new.status = 'SENT' then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select id,'po_sent','PO Baru','Anda menerima Purchase Order baru','purchase_order',new.id from public.profiles where vendor_id=new.vendor_id and role='vendor' and is_active;
  elsif new.status = 'ACCEPTED' then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select id,'po_accepted','PO Diterima Vendor','Vendor menerima Purchase Order','purchase_order',new.id from public.profiles where role in ('owner','admin') and is_active;
  elsif new.status = 'RECONFIRMATION_REQUIRED' then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select id,'po_reconfirmation','Konfirmasi Ulang Diperlukan','PO telah diubah dan perlu dikonfirmasi ulang','purchase_order',new.id from public.profiles where vendor_id=new.vendor_id and role='vendor' and is_active;
  elsif new.status = 'WAITING_APPROVAL' then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select id,'approval_needed','PO Menunggu Persetujuan','Vendor mengajukan PO selesai','purchase_order',new.id from public.profiles where role in ('owner','admin') and is_active;
  elsif new.status = 'COMPLETED' then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select id,'po_approved','PO Disetujui','PO Anda telah disetujui','purchase_order',new.id from public.profiles where vendor_id=new.vendor_id and role='vendor' and is_active;
  elsif new.status = 'REVISION' then
    insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
    select id,'po_revision','Revisi Diperlukan','Owner/admin meminta revisi PO','purchase_order',new.id from public.profiles where vendor_id=new.vendor_id and role='vendor' and is_active;
  end if;
  return new;
end $$;

drop trigger if exists trigger_notify_po_workflow_event on public.purchase_orders;
create trigger trigger_notify_po_workflow_event after update of status on public.purchase_orders for each row execute function public.notify_po_workflow_event();

create or replace function public.enqueue_po_deadline_notifications()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
  select p.id, case when po.po_deadline::date=current_date+1 then 'deadline_tomorrow' else 'deadline_overdue' end,
    case when po.po_deadline::date=current_date+1 then 'Deadline Besok' else 'Deadline Terlewati' end,
    'Periksa Purchase Order Anda','purchase_order',po.id
  from public.purchase_orders po join public.profiles p on p.vendor_id=po.vendor_id and p.role='vendor' and p.is_active
  where po.status in ('SENT','ACCEPTED','IN_PROGRESS','REVISION','RECONFIRMATION_REQUIRED') and po.po_deadline is not null
    and po.po_deadline::date <= current_date+1
    and not exists (select 1 from public.notifications n where n.user_id=p.id and n.entity_id=po.id and n.type=case when po.po_deadline::date=current_date+1 then 'deadline_tomorrow' else 'deadline_overdue' end and n.created_at::date=current_date);
end $$;

grant execute on function public.enqueue_po_deadline_notifications() to service_role;
