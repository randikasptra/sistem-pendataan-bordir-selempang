-- Correct PostgreSQL format padding used by the Phase 3 PO number trigger.
-- %03s pads with spaces; to_char produces the required zero-padded digits.
create or replace function public.generate_po_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sequence bigint;
begin
  v_sequence := nextval('public.po_number_sequence');
  return 'PO-' || to_char(current_date, 'YYYY-MM-DD') || '-' || to_char(v_sequence, 'FM000');
end;
$$;

grant execute on function public.generate_po_number() to authenticated, service_role;
