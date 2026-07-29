-- Development seed data for local Supabase
-- Auth users should be created through Supabase Auth/admin tooling.

insert into public.vendors (code, name, whatsapp, notes, is_active)
values
  ('GRADMINE', 'Gradmine', '+6280000000001', 'Vendor contoh dari PRD', true),
  ('VENDOR-A', 'Vendor A', '+6280000000002', 'Vendor development A', true),
  ('VENDOR-B', 'Vendor B', '+6280000000003', 'Vendor development B', true)
on conflict (code) do update set
  name = excluded.name,
  whatsapp = excluded.whatsapp,
  notes = excluded.notes,
  is_active = excluded.is_active,
  updated_at = now();
