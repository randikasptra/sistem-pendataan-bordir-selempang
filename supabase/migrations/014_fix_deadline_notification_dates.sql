-- Correct Phase 6 deadline boundaries and include distinct per-item deadlines.
create or replace function public.enqueue_po_deadline_notifications()
returns void language plpgsql security definer set search_path = public as $$
begin
  -- PO deadline: tomorrow is H-1; only dates before today are overdue.
  insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
  select p.id,
    case when po.po_deadline::date = current_date + 1 then 'deadline_tomorrow' else 'deadline_overdue' end,
    case when po.po_deadline::date = current_date + 1 then 'Deadline Besok' else 'Deadline Terlewati' end,
    'Periksa Purchase Order Anda','purchase_order',po.id
  from public.purchase_orders po
  join public.profiles p on p.vendor_id=po.vendor_id and p.role='vendor' and p.is_active
  where po.status in ('SENT','ACCEPTED','IN_PROGRESS','REVISION','RECONFIRMATION_REQUIRED')
    and po.po_deadline is not null
    and (po.po_deadline::date = current_date + 1 or po.po_deadline::date < current_date)
    and not exists (
      select 1 from public.notifications n
      where n.user_id=p.id and n.entity_type='purchase_order' and n.entity_id=po.id
        and n.type=case when po.po_deadline::date=current_date+1 then 'deadline_tomorrow' else 'deadline_overdue' end
        and n.created_at::date=current_date
    );

  -- Item deadlines only notify independently when they differ from the PO deadline.
  insert into public.notifications(user_id,type,title,body,entity_type,entity_id)
  select p.id,
    case when i.item_deadline::date = current_date + 1 then 'item_deadline_tomorrow' else 'item_deadline_overdue' end,
    case when i.item_deadline::date = current_date + 1 then 'Deadline Item Besok' else 'Deadline Item Terlewati' end,
    'Periksa item PO: ' || i.title,'po_item',i.id
  from public.po_items i
  join public.purchase_orders po on po.id=i.po_id
  join public.profiles p on p.vendor_id=po.vendor_id and p.role='vendor' and p.is_active
  where po.status in ('SENT','ACCEPTED','IN_PROGRESS','REVISION','RECONFIRMATION_REQUIRED')
    and i.item_deadline is not null
    and (po.po_deadline is null or i.item_deadline::date is distinct from po.po_deadline::date)
    and (i.item_deadline::date = current_date + 1 or i.item_deadline::date < current_date)
    and not exists (
      select 1 from public.notifications n
      where n.user_id=p.id and n.entity_type='po_item' and n.entity_id=i.id
        and n.type=case when i.item_deadline::date=current_date+1 then 'item_deadline_tomorrow' else 'item_deadline_overdue' end
        and n.created_at::date=current_date
    );
end $$;

grant execute on function public.enqueue_po_deadline_notifications() to service_role;
