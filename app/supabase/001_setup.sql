-- Solar CRM (Sunpay) — Supabase setup, part 1.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run: everything uses IF NOT EXISTS / OR REPLACE.
--
-- DEMO ACCESS: the app currently has a demo sign-in (email only, no password) that does not create a
-- Supabase user, so these policies let the app's public (anon) key read and write the CRM tables.
-- That is fine for fake demo data ONLY. Before any real customer data goes in, switch to real sign-in
-- and replace the "demo_*" policies with per-role policies (see README → "Before real data").

-- ---------- customers / projects ----------
-- One row per customer project. `data` holds the full record the app works with (tracks, timeline,
-- payments, documents…). The plain columns copy the fields that filtering and access rules need.
create table if not exists public.projects (
  id          text primary key,                 -- PRJ-2026-0001
  crn         text not null unique,             -- CRN-2026-0001
  name        text not null,
  phone       text,
  city        text,
  branch      text not null,                    -- Main Office / North Division / South Division
  segment     text not null,                    -- Residential / Commercial / Industrial
  cp          text,                             -- channel partner id
  dealer      text,                             -- dealer id
  team        text,                             -- installation crew id
  technician  text,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists projects_branch_idx on public.projects (branch);
create index if not exists projects_cp_idx on public.projects (cp);
create index if not exists projects_dealer_idx on public.projects (dealer);
create index if not exists projects_team_idx on public.projects (team);

-- CRN / Project ID numbers come from the database so two people adding leads at once never clash.
create table if not exists public.counters (name text primary key, value bigint not null);
create or replace function public.next_project_number() returns bigint
language sql volatile security definer set search_path = public as $$
  insert into public.counters (name, value)
  values ('project', coalesce((select max(substring(id from '(\d+)$')::bigint) from public.projects), 0) + 1)
  on conflict (name) do update
    set value = greatest(public.counters.value, (select coalesce(max(substring(id from '(\d+)$')::bigint), 0) from public.projects)) + 1
  returning value;
$$;

-- ---------- activity log ----------
create table if not exists public.activity (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  project  text references public.projects (id) on delete cascade,
  data     jsonb not null
);
create index if not exists activity_at_idx on public.activity (at desc);

-- ---------- shared settings: inventory, attendance, saved list views ----------
create table if not exists public.app_state (
  key         text primary key,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------- team chat (Admin + Office staff, one shared room) ----------
create table if not exists public.chat_messages (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  author     text not null check (length(author) between 1 and 80),
  role       text not null check (role in ('Admin', 'Office Staff')),
  branch     text,
  body       text not null check (length(body) between 1 and 2000)
);
create index if not exists chat_messages_at_idx on public.chat_messages (at desc);

-- ---------- access (demo) ----------
alter table public.projects      enable row level security;
alter table public.activity      enable row level security;
alter table public.app_state     enable row level security;
alter table public.chat_messages enable row level security;
alter table public.counters      enable row level security;   -- only reachable through next_project_number()

drop policy if exists demo_projects_all on public.projects;
create policy demo_projects_all on public.projects for all to anon, authenticated using (true) with check (true);
drop policy if exists demo_activity_all on public.activity;
create policy demo_activity_all on public.activity for all to anon, authenticated using (true) with check (true);
drop policy if exists demo_state_all on public.app_state;
create policy demo_state_all on public.app_state for all to anon, authenticated using (true) with check (true);
-- Chat: read and post only; nobody edits or deletes messages through the app.
drop policy if exists demo_chat_read on public.chat_messages;
create policy demo_chat_read on public.chat_messages for select to anon, authenticated using (true);
drop policy if exists demo_chat_post on public.chat_messages;
create policy demo_chat_post on public.chat_messages for insert to anon, authenticated with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.projects, public.activity, public.app_state to anon, authenticated;
grant select, insert on public.chat_messages to anon, authenticated;
grant execute on function public.next_project_number() to anon, authenticated;

-- ---------- live updates ----------
-- Chat messages and customer changes are pushed to every open screen.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'projects') then
    alter publication supabase_realtime add table public.projects;
  end if;
end $$;
