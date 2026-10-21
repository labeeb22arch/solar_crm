-- DEMO DATA ONLY: these are illustrative values, not verified customer details.
-- Run in the Supabase SQL Editor for the project used by this CRM.
-- Close CRM tabs before running, then reopen after completion.
-- Fills missing details across existing PRJ-2026 demo records; does not create customers.
-- Existing non-empty fields, receipts, serials, documents and checklists are preserved.
begin;

with selected as (
  select id, data
  from public.projects
  where id ~ '^PRJ-2026-[0-9]{4}$'
    and coalesce(data->>'deletedAt','') = ''
    and coalesce(data->>'deleted_at','') = ''
  for update
), prepared as (
  select p.id, p.data,
    jsonb_build_object(
      'email', 'demo.' || lower(p.id) || '@example.com',
      'fileNo', 'DEMO-FILE-' || p.id,
      'subDivision', 'Demo sub-division',
      'portalId', 'DEMO-REG-' || p.id,
      'registrationDate', '2026-10-01',
      'registeredBy', 'Demo Office Staff',
      'registrationStatus', 'Applied',
      'scheme', 'pm_surya_ghar',
      'bankBranch', 'Demo branch',
      'roofShed', 'Roof',
      'dcCable', 40,
      'acCable', 25,
      'frontLegHeight', 3,
      'rearLegHeight', 6,
      'materialNotes', 'Demo specification: roof-mounted structure; confirm cable route and measurements at site.'
    ) || case when p.data->>'paymentMethod' in ('Bank Solar Loan','Personal Loan')
       then jsonb_build_object('janSamarthNo','DEMO-JS-' || p.id,'loanBy','Demo Loan Desk')
       else '{}'::jsonb end as defaults,
    jsonb_build_object(
      'moduleMake', 'Waaree',
      'moduleModel', 'Demo mono PERC module',
      'moduleWp', 500,
      'inverterMake', 'Sungrow',
      'inverterModel', 'Demo on-grid inverter',
      'inverterCapacity', coalesce(nullif(p.data->>'kwp','')::numeric,4),
      'inverterPhase', 'Single phase',
      'structure', 'Hot-dip galvanised steel',
      'earthing', 'DC and AC earthing with lightning protection'
    ) as equipment_defaults
  from selected p
), filled as (
  select p.id,
    p.data || coalesce(root_patch.value,'{}'::jsonb)
    || jsonb_build_object('warranty',
      coalesce(nullif(p.data->'warranty','null'::jsonb),'{}'::jsonb)
      || coalesce(equipment_patch.value,'{}'::jsonb)
    ) as next_data
  from prepared p
  cross join lateral (
    select jsonb_object_agg(e.key,e.value) as value
    from jsonb_each(p.defaults) e
    where coalesce(btrim(p.data->>e.key),'') in ('','—')
  ) root_patch
  cross join lateral (
    select jsonb_object_agg(e.key,e.value) as value
    from jsonb_each(p.equipment_defaults) e
    where coalesce(btrim(p.data->'warranty'->>e.key),'') in ('','—')
  ) equipment_patch
)
update public.projects p
set data = f.next_data, updated_at = now()
from filled f
where p.id = f.id and p.data is distinct from f.next_data
returning p.id, p.name, p.data->>'fileNo' as file_number,
  p.data->>'portalId' as registration_number,
  p.data->>'janSamarthNo' as jansamarth_number,
  p.data->>'roofShed' as roof_shed;

commit;
