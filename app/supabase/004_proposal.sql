-- Solar CRM (Sunpay) — Supabase setup, part 4: residential proposal acceptance through the public link.
-- Run once in the Supabase dashboard: SQL Editor → New query → paste this whole file → Run. Safe to re-run.
-- Needs 001_setup.sql and 002_users.sql to have been run first.
--
-- The public page (#/sign/<token>) has no table access. It only calls these two functions with the secret token.
-- They now handle two kinds of token:
--   * agreement  — data.signRequest.token    (unchanged behaviour from 002_users.sql; the reply only gains "kind")
--   * proposal   — data.proposalRequest.token (new: returns the sent proposal snapshot; accepting it records
--                  the customer's signature on the proposal and approves the quotation)

-- ---------- what the link page may show ----------
-- Agreement: { kind, firstName, kwp, status, expired } — the same fields as before, plus kind.
-- Proposal:  { kind, firstName, kwp, status, expired, name, city, proposal } — proposal is the snapshot saved when
--            the proposal was sent (data.proposal: version, number, createdAt, inputs, totals, accepted). Nothing else.
create or replace function public.sign_request(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d jsonb;
begin
  if p_token is null or length(p_token) < 30 then return null; end if;

  select data into d from public.projects where data #>> '{signRequest,token}' = p_token limit 1;
  if d is not null then
    return jsonb_build_object(
      'kind', 'agreement',
      'firstName', split_part(d ->> 'name', ' ', 1),
      'kwp', d ->> 'kwp',
      'status', d #>> '{signRequest,status}',
      'expired', coalesce((d #>> '{signRequest,expiresAt}')::timestamptz < now(), true)
    );
  end if;

  select data into d from public.projects where data #>> '{proposalRequest,token}' = p_token limit 1;
  if d is null then return null; end if;
  return jsonb_build_object(
    'kind', 'proposal',
    'firstName', split_part(d ->> 'name', ' ', 1),
    'kwp', coalesce(d #>> '{proposal,inputs,kwp}', d ->> 'kwp'),
    'status', d #>> '{proposalRequest,status}',
    'expired', coalesce((d #>> '{proposalRequest,expiresAt}')::timestamptz < now(), true),
    'name', d ->> 'name',
    'city', d ->> 'city',
    'proposal', d -> 'proposal'
  );
end $$;

-- ---------- save the customer's signature / acceptance ----------
-- Agreement tokens: exactly as in 002_users.sql (signature, signRequest.status/usedAt, timeline, activity).
-- Proposal tokens: proposal.accepted = { png, at, method }, proposalRequest.status = 'signed' (+ usedAt),
-- quotation.status = 'approved', the "quotation" step in tracks.sales marked done, timeline + activity row
-- "Customer accepted proposal vN (drawn|photo)". Refuses unknown, used or expired links.
create or replace function public.submit_signature(p_token text, p_png text, p_method text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare
  pid text;
  d jsonb;
  ver text;
  msg text;
  stamp text := to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if length(p_token) < 30 or p_png not like 'data:image/png;base64,%' or length(p_png) > 400000
     or p_method not in ('drawn', 'photo') then
    raise exception 'Invalid signature';
  end if;
  select id, data into pid, d from public.projects
  where data #>> '{signRequest,token}' = p_token for update;

  if pid is null then
    -- Not an agreement link: try a proposal acceptance link.
    select id, data into pid, d from public.projects
    where data #>> '{proposalRequest,token}' = p_token for update;
    if pid is null or jsonb_typeof(d -> 'proposal') is distinct from 'object' then raise exception 'Unknown link'; end if;
    if d #>> '{proposalRequest,status}' = 'signed' then raise exception 'Already signed'; end if;
    if (d #>> '{proposalRequest,expiresAt}')::timestamptz < now() then raise exception 'Link expired'; end if;
    ver := coalesce(d #>> '{proposal,version}', '1');
    msg := 'Customer accepted proposal v' || ver || ' (' || p_method || ')';
    d := jsonb_set(d, '{proposal,accepted}', jsonb_build_object('png', p_png, 'at', stamp, 'method', p_method));
    d := jsonb_set(d, '{proposalRequest,status}', '"signed"');
    d := jsonb_set(d, '{proposalRequest,usedAt}', to_jsonb(stamp));
    d := jsonb_set(d, '{quotation}',
           (case when jsonb_typeof(d -> 'quotation') = 'object' then d -> 'quotation'
                 else jsonb_build_object('version', ver::int, 'sentAt', d #>> '{proposal,createdAt}') end)
           || jsonb_build_object('status', 'approved', 'approvedAt', stamp));
    if jsonb_typeof(d #> '{tracks,sales}') = 'array' then
      d := jsonb_set(d, '{tracks,sales}', (
        select coalesce(jsonb_agg(case when e ->> 'key' = 'quotation'
                                       then e || jsonb_build_object('status', 'done', 'updatedAt', stamp)
                                       else e end order by i), '[]'::jsonb)
        from jsonb_array_elements(d #> '{tracks,sales}') with ordinality as t(e, i)));
    end if;
    d := jsonb_set(d, '{timeline}', coalesce(d -> 'timeline', '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
           'type', 'document', 'at', stamp, 'by', 'Customer', 'text', msg)));
    update public.projects set data = d, updated_at = now() where id = pid;
    insert into public.activity (project, data) values (pid, jsonb_build_object(
      'type', 'document', 'at', stamp, 'by', 'Customer', 'text', msg,
      'crn', d ->> 'crn', 'pid', pid, 'customer', d ->> 'name'));
    return true;
  end if;

  -- Agreement link (unchanged).
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

-- Proposal settings live in app_state under the key 'proposal_settings' (staff-only, like every app_state row);
-- the app creates the row itself the first time it saves. Nothing to set up here.
