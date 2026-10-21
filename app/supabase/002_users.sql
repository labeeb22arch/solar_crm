-- Solar CRM (Sunpay) — Supabase setup, part 2: real sign-in, user profiles and locked-down access.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run.
--
-- After this runs, ONLY signed-in, active staff can read or change CRM data. The public (anon) key alone
-- can no longer read anything, except the two signing-link functions at the bottom, which return or accept
-- data for one customer by their secret link token.

-- ---------- profiles: one row per login, keyed by the Supabase user id (UUID) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '',
  email       text not null,
  role        text not null default 'Pending'
              check (role in ('Pending', 'Admin', 'Office Staff', 'Finance', 'Installation Team', 'CPO', 'CP', 'Dealer', 'Technician', 'Stamp Staff')),
  branch      text,             -- Main Office / North Division / South Division (Office staff)
  team        text,             -- installation crew id (Installation Team)
  cpo_id      text,             -- partner office id (CPO)
  phone       text,
  active      boolean not null default false,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles (role);

-- Every new login gets a profile automatically. The very first account becomes the active Admin; every later
-- account starts as an inactive "Pending" profile until an Admin sets its role (the app does this right after
-- creating the account). The role is never taken from sign-up data, so nobody can make themselves Admin.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  is_first boolean;
begin
  select not exists (select 1 from public.profiles where role = 'Admin' and active) into is_first;
  insert into public.profiles (id, name, email, role, active)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), new.email,
          case when is_first then 'Admin' else 'Pending' end, is_first)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Keep the profile email in step when someone changes their login email.
create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email, updated_at = now() where id = new.id;
  return new;
end $$;
drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users for each row execute function public.handle_user_email_change();

-- Helpers used by the access rules.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() not in ('Pending'), false)
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'Admin', false)
$$;

-- Profiles: everyone sees their own; Admin sees and edits all. Nobody deletes — Admin deactivates instead.
alter table public.profiles enable row level security;
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, update on public.profiles to authenticated;

-- Never leave the company without an active Admin.
create or replace function public.keep_one_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.role = 'Admin' and old.active and (new.role <> 'Admin' or not new.active)
     and not exists (select 1 from public.profiles where role = 'Admin' and active and id <> old.id) then
    raise exception 'At least one active Admin is required';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists profiles_keep_one_admin on public.profiles;
create trigger profiles_keep_one_admin before update on public.profiles for each row execute function public.keep_one_admin();

-- ---------- lock the CRM tables to signed-in, active staff ----------
drop policy if exists demo_projects_all on public.projects;
drop policy if exists demo_activity_all on public.activity;
drop policy if exists demo_state_all on public.app_state;
drop policy if exists demo_chat_read on public.chat_messages;
drop policy if exists demo_chat_post on public.chat_messages;

drop policy if exists staff_projects_all on public.projects;
create policy staff_projects_all on public.projects for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_activity_all on public.activity;
create policy staff_activity_all on public.activity for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists staff_state_all on public.app_state;
create policy staff_state_all on public.app_state for all to authenticated using (public.is_staff()) with check (public.is_staff());
drop policy if exists chat_read on public.chat_messages;
create policy chat_read on public.chat_messages for select to authenticated using (public.my_role() in ('Admin', 'Office Staff'));
drop policy if exists chat_post on public.chat_messages;
create policy chat_post on public.chat_messages for insert to authenticated with check (public.my_role() = role and role in ('Admin', 'Office Staff'));

revoke all on public.projects, public.activity, public.app_state, public.chat_messages from anon;

-- CRN numbers: staff only.
create or replace function public.next_project_number() returns bigint
language plpgsql volatile security definer set search_path = public as $$
declare
  n bigint;
begin
  if not public.is_staff() then raise exception 'Not allowed'; end if;
  insert into public.counters (name, value)
  values ('project', coalesce((select max(substring(id from '(\d+)$')::bigint) from public.projects), 0) + 1)
  on conflict (name) do update
    set value = greatest(public.counters.value, (select coalesce(max(substring(id from '(\d+)$')::bigint), 0) from public.projects)) + 1
  returning value into n;
  return n;
end $$;
revoke execute on function public.next_project_number() from anon;
grant execute on function public.next_project_number() to authenticated;

-- ---------- customer signing link (public, by secret token only) ----------
-- Returns only what the signing page shows: first name, system size and link status.
create or replace function public.sign_request(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'firstName', split_part(data ->> 'name', ' ', 1),
    'kwp', data ->> 'kwp',
    'status', data #>> '{signRequest,status}',
    'expired', coalesce((data #>> '{signRequest,expiresAt}')::timestamptz < now(), true)
  )
  from public.projects
  where length(p_token) >= 30 and data #>> '{signRequest,token}' = p_token
  limit 1
$$;

-- Saves the customer's signature for the project that owns this token; refuses expired or used links.
create or replace function public.submit_signature(p_token text, p_png text, p_method text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  pid text;
  d jsonb;
  stamp text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if length(p_token) < 30 or p_png not like 'data:image/png;base64,%' or length(p_png) > 400000
     or p_method not in ('drawn', 'photo') then
    raise exception 'Invalid signature';
  end if;
  select id, data into pid, d from public.projects
  where data #>> '{signRequest,token}' = p_token for update;
  if pid is null then raise exception 'Unknown link'; end if;
  if d #>> '{signRequest,status}' = 'signed' then raise exception 'Already signed'; end if;
  if (d #>> '{signRequest,expiresAt}')::timestamptz < now() then raise exception 'Link expired'; end if;
  d := jsonb_set(d, '{signature}', jsonb_build_object('png', p_png, 'at', stamp, 'method', p_method));
  d := jsonb_set(d, '{signRequest,status}', '"signed"');
  d := jsonb_set(d, '{signRequest,usedAt}', to_jsonb(stamp));
  d := jsonb_set(d, '{timeline}', coalesce(d -> 'timeline', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
         'type', 'document', 'at', stamp, 'by', 'Customer', 'text', 'Customer signed via link (' || p_method || ')')));
  update public.projects set data = d, updated_at = now() where id = pid;
  insert into public.activity (project, data) values (pid, jsonb_build_object(
    'type', 'document', 'at', stamp, 'by', 'Customer', 'text', 'Customer signed via link (' || p_method || ')',
    'crn', d ->> 'crn', 'pid', pid, 'customer', d ->> 'name'));
  return true;
end $$;
grant execute on function public.sign_request(text) to anon, authenticated;
grant execute on function public.submit_signature(text, text, text) to anon, authenticated;

-- Live updates for the user list.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
end $$;

-- Lets the sign-in screen offer "Create the first admin account" only while no Admin exists yet.
create or replace function public.has_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where role = 'Admin' and active)
$$;
grant execute on function public.has_admin() to anon, authenticated;
