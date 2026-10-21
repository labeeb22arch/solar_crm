-- Solar CRM (Sunpay) — part 6: make sure ONLY the per-role rules from 005 apply.
-- Testing showed every role could still read every customer: some other access rule (or row security being
-- switched off) was letting all rows through. This removes every rule on the CRM tables that is not one of the
-- rules from 005, switches row security on, and then lists what is left so you can see it.
-- Run in Supabase → SQL Editor → New query → Run. Safe to re-run.

do $$
declare
  r record;
  keep text[] := array[
    'projects_read', 'projects_add', 'projects_change', 'projects_remove',
    'activity_read', 'activity_add',
    'state_read', 'state_write', 'state_update',
    'chat_read', 'chat_post'
  ];
begin
  for r in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('projects', 'activity', 'app_state', 'chat_messages')
      and not (policyname = any (keep))
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    raise notice 'Removed extra rule % on %', r.policyname, r.tablename;
  end loop;
end $$;

alter table public.projects      enable row level security;
alter table public.activity      enable row level security;
alter table public.app_state     enable row level security;
alter table public.chat_messages enable row level security;

-- What is left (should be exactly the 11 rules named above, and row security = true on all four tables):
select t.tablename, t.rowsecurity as row_security_on, p.policyname, p.cmd
from pg_tables t
left join pg_policies p on p.schemaname = t.schemaname and p.tablename = t.tablename
where t.schemaname = 'public' and t.tablename in ('projects', 'activity', 'app_state', 'chat_messages')
order by t.tablename, p.policyname;
