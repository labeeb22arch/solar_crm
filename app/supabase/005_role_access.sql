-- Solar CRM (Sunpay) — Supabase setup, part 5: each role sees only its own customers, enforced by the database.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this whole file → Run. Safe to re-run.
-- Needs 001–004 to have been run first.
--
-- Before this, any active login could read every customer through the API; the app only hid the rest on screen.
-- After this, the database itself returns only:
--   Admin, Accountant (Finance) ........ every customer (Accountant cannot change anything)
--   Staff (Office Staff) ............... customers of their branch
--   CPO ................................ customers of the channel partners under their partner office
--   CP ................................. their own customers (including their dealers' customers)
--   Dealer ............................. their own customers
--   Installation Team .................. jobs of their crew
--   Technician ......................... jobs assigned to them
--   Stamp Staff ........................ every customer (the app shows only the stamp queue)

-- ---------- profile fields used for scoping ----------
alter table public.profiles add column if not exists cp_id      text;   -- CP: their channel partner id
alter table public.profiles add column if not exists dealer_id  text;   -- Dealer: their dealer id
alter table public.profiles add column if not exists technician text;   -- Technician: name as written on jobs

-- ---------- partner hierarchy: CPO → CP → Dealer ----------
create table if not exists public.partners (
  id      text primary key,                                   -- CPO-1 / CP-01 / DL-01
  kind    text not null check (kind in ('CPO', 'CP', 'Dealer')),
  parent  text references public.partners (id),                -- CP → its CPO, Dealer → its CP
  name    text not null
);
insert into public.partners (id, kind, parent, name) values
  ('CPO-1', 'CPO', null, 'Suryakiran Partner Office'),
  ('CPO-2', 'CPO', null, 'Banas Solar Network'),
  ('CPO-3', 'CPO', null, 'Uttar Gujarat Partner Hub'),
  ('CP-01', 'CP', 'CPO-1', 'Ujala Energy Point'),
  ('CP-02', 'CP', 'CPO-1', 'GreenRoof Partners'),
  ('CP-03', 'CP', 'CPO-1', 'Tejas Renewables'),
  ('CP-04', 'CP', 'CPO-2', 'Prakash Power Solutions'),
  ('CP-05', 'CP', 'CPO-2', 'Suryoday Solar Services'),
  ('CP-06', 'CP', 'CPO-2', 'Kiran Rooftop Co'),
  ('CP-07', 'CP', 'CPO-3', 'Arka Energy Associates'),
  ('CP-08', 'CP', 'CPO-3', 'Navdeep Solar Point'),
  ('DL-01', 'Dealer', 'CP-01', 'Shiv Electricals'),
  ('DL-02', 'Dealer', 'CP-01', 'Om Traders'),
  ('DL-03', 'Dealer', 'CP-02', 'Jay Ambe Electric'),
  ('DL-04', 'Dealer', 'CP-03', 'Maruti Solar Shop'),
  ('DL-05', 'Dealer', 'CP-04', 'Khodiyar Enterprise'),
  ('DL-06', 'Dealer', 'CP-04', 'Ganesh Power House'),
  ('DL-07', 'Dealer', 'CP-05', 'Balaji Electricals'),
  ('DL-08', 'Dealer', 'CP-06', 'Sai Krupa Agency'),
  ('DL-09', 'Dealer', 'CP-07', 'Hari Om Solar'),
  ('DL-10', 'Dealer', 'CP-07', 'Ma Umiya Electric'),
  ('DL-11', 'Dealer', 'CP-08', 'Radhe Krishna Energy'),
  ('DL-12', 'Dealer', 'CP-08', 'Vishwas Electricals')
on conflict (id) do nothing;
alter table public.partners enable row level security;
drop policy if exists partners_read on public.partners;
create policy partners_read on public.partners for select to authenticated using (public.is_staff());
drop policy if exists partners_admin on public.partners;
create policy partners_admin on public.partners for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.partners to authenticated;

-- ---------- the one rule: can the signed-in person see this customer? ----------
create or replace function public.can_see_project(p_branch text, p_cp text, p_dealer text, p_team text, p_technician text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case pr.role
      when 'Admin'             then true
      when 'Finance'           then true
      when 'Stamp Staff'       then true
      when 'Office Staff'      then p_branch = pr.branch
      when 'CPO'               then exists (select 1 from public.partners c where c.id = p_cp and c.kind = 'CP' and c.parent = pr.cpo_id)
      when 'CP'                then p_cp = pr.cp_id
      when 'Dealer'            then p_dealer = pr.dealer_id
      when 'Installation Team' then p_team = pr.team
      when 'Technician'        then p_technician = coalesce(pr.technician, pr.name)
      else false
    end
    from public.profiles pr
    where pr.id = auth.uid() and pr.active and pr.role <> 'Pending'
  ), false)
$$;
grant execute on function public.can_see_project(text, text, text, text, text) to authenticated;

-- ---------- customers ----------
drop policy if exists staff_projects_all on public.projects;
drop policy if exists projects_read on public.projects;
drop policy if exists projects_add on public.projects;
drop policy if exists projects_change on public.projects;
drop policy if exists projects_remove on public.projects;
create policy projects_read on public.projects for select to authenticated
  using (public.can_see_project(branch, cp, dealer, team, technician));
-- New customers: office and partners only, and only inside what they can see (a partner can't add for another).
create policy projects_add on public.projects for insert to authenticated
  with check (public.my_role() in ('Admin', 'Office Staff', 'CPO', 'CP', 'Dealer')
              and public.can_see_project(branch, cp, dealer, team, technician));
-- Changes: anyone who can see the customer, except the Accountant (read-only). They can't move it out of their reach.
create policy projects_change on public.projects for update to authenticated
  using (public.my_role() <> 'Finance' and public.can_see_project(branch, cp, dealer, team, technician))
  with check (public.can_see_project(branch, cp, dealer, team, technician));
create policy projects_remove on public.projects for delete to authenticated using (public.is_admin());

-- ---------- activity log: only entries about customers you can see ----------
drop policy if exists staff_activity_all on public.activity;
drop policy if exists activity_read on public.activity;
drop policy if exists activity_add on public.activity;
create policy activity_read on public.activity for select to authenticated
  using ((project is null and public.my_role() in ('Admin', 'Office Staff', 'Finance'))
         or exists (select 1 from public.projects p where p.id = activity.project));
create policy activity_add on public.activity for insert to authenticated
  with check (public.is_staff() and public.my_role() <> 'Finance'
              and (project is null or exists (select 1 from public.projects p where p.id = activity.project)));

-- ---------- shared settings: everyone reads, only roles that change them write ----------
drop policy if exists staff_state_all on public.app_state;
drop policy if exists state_read on public.app_state;
drop policy if exists state_write on public.app_state;
drop policy if exists state_update on public.app_state;
create policy state_read on public.app_state for select to authenticated using (public.is_staff());
create policy state_write on public.app_state for insert to authenticated
  with check (public.my_role() in ('Admin', 'Office Staff', 'Installation Team', 'Technician', 'Stamp Staff'));
create policy state_update on public.app_state for update to authenticated
  using (public.my_role() in ('Admin', 'Office Staff', 'Installation Team', 'Technician', 'Stamp Staff'))
  with check (public.my_role() in ('Admin', 'Office Staff', 'Installation Team', 'Technician', 'Stamp Staff'));

-- ---------- users: create_staff_user also fills the new scoping fields ----------
-- (Re-create with extra optional arguments; old calls keep working.)
drop function if exists public.create_staff_user(text, text, text, text, text, text, text, text);
create or replace function public.create_staff_user(
  p_email      text,
  p_password   text,
  p_name       text,
  p_role       text,
  p_branch     text default null,
  p_team       text default null,
  p_cpo_id     text default null,
  p_phone      text default null,
  p_cp_id      text default null,
  p_dealer_id  text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid     uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Not a valid email: %', p_email; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  if p_role not in ('Admin', 'Office Staff', 'Finance', 'Installation Team', 'CPO', 'CP', 'Dealer', 'Technician', 'Stamp Staff') then
    raise exception 'Unknown role: %', p_role;
  end if;
  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'A login with % already exists', v_email;
  end if;
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', v_email,
    crypt(p_password, gen_salt('bf')), now(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('name', coalesce(p_name, '')), now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid, uid::text,
          jsonb_build_object('sub', uid::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());
  update public.profiles set
    name       = coalesce(p_name, ''),
    role       = p_role,
    branch     = case when p_role = 'Office Staff' then coalesce(p_branch, 'Main Office') end,
    team       = case when p_role = 'Installation Team' then coalesce(p_team, 'T-A') end,
    cpo_id     = case when p_role = 'CPO' then coalesce(p_cpo_id, 'CPO-1') end,
    cp_id      = case when p_role = 'CP' then coalesce(p_cp_id, 'CP-01') end,
    dealer_id  = case when p_role = 'Dealer' then coalesce(p_dealer_id, 'DL-01') end,
    technician = case when p_role = 'Technician' then coalesce(p_name, '') end,
    phone      = p_phone,
    active     = true
  where id = uid;
  return uid;
end $$;
revoke execute on function public.create_staff_user(text, text, text, text, text, text, text, text, text, text) from public, anon, authenticated;
