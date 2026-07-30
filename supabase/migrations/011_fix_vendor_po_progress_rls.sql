-- Correct the vendor PO update policy applied by Phase 3.
-- Vendors may progress only their own PO, while the trigger below restricts
-- both the changed columns and the allowed state transitions.

drop policy if exists "vendor_update_own_po_progress" on public.purchase_orders;

create policy "vendor_update_own_po_progress" on public.purchase_orders
for update
using (
  public.current_user_role() = 'vendor'
  and vendor_id = public.current_user_vendor_id()
  and status in ('SENT', 'ACCEPTED', 'IN_PROGRESS', 'REVISION', 'RECONFIRMATION_REQUIRED')
)
with check (
  public.current_user_role() = 'vendor'
  and vendor_id = public.current_user_vendor_id()
  and status in ('ACCEPTED', 'IN_PROGRESS', 'WAITING_APPROVAL')
);

create or replace function public.enforce_vendor_po_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'vendor' then
    return new;
  end if;

  if old.vendor_id is distinct from public.current_user_vendor_id()
    or new.vendor_id is distinct from old.vendor_id then
    raise exception 'Vendor may only update its own purchase order';
  end if;

  if (to_jsonb(new) - 'status' - 'updated_at')
       is distinct from (to_jsonb(old) - 'status' - 'updated_at') then
    raise exception 'Vendor may only update purchase order status';
  end if;

  if not (
    (old.status = 'SENT' and new.status = 'ACCEPTED')
    or (old.status = 'ACCEPTED' and new.status = 'IN_PROGRESS')
    or (old.status = 'IN_PROGRESS' and new.status = 'WAITING_APPROVAL')
    or (old.status = 'REVISION' and new.status = 'IN_PROGRESS')
    or (old.status = 'RECONFIRMATION_REQUIRED' and new.status = 'IN_PROGRESS')
  ) then
    raise exception 'Invalid vendor purchase order status transition: % -> %', old.status, new.status;
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_enforce_vendor_po_update on public.purchase_orders;
create trigger trigger_enforce_vendor_po_update
before update on public.purchase_orders
for each row execute function public.enforce_vendor_po_update();

grant execute on function public.enforce_vendor_po_update() to authenticated, service_role;
