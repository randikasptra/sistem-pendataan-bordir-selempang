-- Correct Phase 3 internal PO update access without changing vendor policies.
-- RLS grants internal users access to PO rows; the trigger below constrains
-- the workflow transitions that an owner or admin may perform.

drop policy if exists "internal_users_update_own_pos" on public.purchase_orders;

create policy "internal_users_update_pos" on public.purchase_orders
for update
using (public.current_user_role() in ('owner', 'admin'))
with check (public.current_user_role() in ('owner', 'admin'));

create or replace function public.enforce_internal_po_workflow_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_name text;
begin
  role_name := public.current_user_role();

  if role_name not in ('owner', 'admin') or new.status = old.status then
    return new;
  end if;

  if (old.status = 'DRAFT' and new.status in ('SENT', 'CANCELLED'))
    or (old.status = 'SENT' and new.status = 'CANCELLED')
    or (old.status = 'ACCEPTED' and new.status in ('RECONFIRMATION_REQUIRED', 'CANCELLED'))
    or (old.status = 'IN_PROGRESS' and new.status in ('RECONFIRMATION_REQUIRED', 'CANCELLED'))
    or (old.status = 'RECONFIRMATION_REQUIRED' and new.status = 'CANCELLED')
    or (old.status = 'WAITING_APPROVAL' and new.status in ('COMPLETED', 'REVISION', 'CANCELLED'))
    or (old.status = 'REVISION' and new.status = 'CANCELLED')
    or (old.status = 'COMPLETED' and new.status = 'IN_PROGRESS' and role_name = 'owner') then
    return new;
  end if;

  raise exception 'Invalid internal purchase order status transition: % -> %', old.status, new.status;
end;
$$;

drop trigger if exists trigger_enforce_internal_po_workflow_transition on public.purchase_orders;
create trigger trigger_enforce_internal_po_workflow_transition
before update on public.purchase_orders
for each row execute function public.enforce_internal_po_workflow_transition();

grant execute on function public.enforce_internal_po_workflow_transition() to authenticated, service_role;
