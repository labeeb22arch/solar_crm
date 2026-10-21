-- Solar CRM (Sunpay) — Supabase setup, part 3: create a user (login + profile) in one step from the SQL Editor.
-- Run this whole file once to install the function. Then create people with one line each, for example:
--
--   select public.create_staff_user('urvesh@sunpays.in', 'ChangeMe#2026', 'Urvesh', 'Admin');
--   select public.create_staff_user('office@sunpays.in', 'ChangeMe#2026', 'Main office desk', 'Office Staff', 'Main Office');
--   select public.create_staff_user('accounts@sunpays.in', 'ChangeMe#2026', 'Accounts', 'Finance');
--   select public.create_staff_user('crew.alpha@sunpays.in', 'ChangeMe#2026', 'Crew Alpha lead', 'Installation Team', null, 'T-A');
--   select public.create_staff_user('cpo1@sunpays.in', 'ChangeMe#2026', 'Suryakiran office', 'CPO', null, null, 'CPO-1');
--
-- Roles: 'Admin', 'Office Staff' (Staff), 'Finance' (Accountant), 'Installation Team', 'CPO'.
-- Branch (Office Staff): 'Main Office' | 'North Division' | 'South Division'.
-- Crew (Installation Team): 'T-A' Crew Alpha | 'T-B' Crew Beta | 'T-R' Rudra Installers | 'T-M' BrightMount Services.
-- Partner office (CPO): 'CPO-1' | 'CPO-2' | 'CPO-3'.
--
-- The login is created already confirmed, so the person can sign in straight away with that email and password.
-- Only the SQL Editor (database owner) can run this function; the app's public key cannot.

create or replace function public.create_staff_user(
  p_email    text,
  p_password text,
  p_name     text,
  p_role     text,
  p_branch   text default null,
  p_team     text default null,
  p_cpo_id   text default null,
  p_phone    text default null
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  uid   uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Not a valid email: %', p_email; end if;
  if length(coalesce(p_password, '')) < 8 then raise exception 'Password must be at least 8 characters'; end if;
  if p_role not in ('Admin', 'Office Staff', 'Finance', 'Installation Team', 'CPO', 'CP', 'Dealer', 'Technician', 'Stamp Staff') then
    raise exception 'Unknown role: % (use Admin, Office Staff, Finance, Installation Team or CPO)', p_role;
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

  -- The sign-up trigger has created the profile row; fill it in and switch it on.
  update public.profiles set
    name   = coalesce(p_name, ''),
    role   = p_role,
    branch = case when p_role = 'Office Staff' then coalesce(p_branch, 'Main Office') end,
    team   = case when p_role = 'Installation Team' then coalesce(p_team, 'T-A') end,
    cpo_id = case when p_role = 'CPO' then coalesce(p_cpo_id, 'CPO-1') end,
    phone  = p_phone,
    active = true
  where id = uid;

  return uid;
end $$;

-- Database owner only: never callable from the app or the public key.
revoke execute on function public.create_staff_user(text, text, text, text, text, text, text, text) from public, anon, authenticated;
