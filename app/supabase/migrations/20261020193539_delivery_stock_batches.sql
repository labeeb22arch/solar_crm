-- Stock and delivery batches commit together, with conflict checks for concurrent desks.
-- SECURITY INVOKER keeps existing app_state RLS in force.
create or replace function public.commit_delivery_stock(expected_inventory jsonb, expected_batches jsonb, next_inventory jsonb, next_batches jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare current_inventory jsonb; current_batches jsonb;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and active and role in ('Admin', 'Office Staff')) then
    raise exception 'Only office staff can manage delivery stock';
  end if;
  select data into current_inventory from public.app_state where key = 'inventory' for update;
  if current_inventory is null then raise exception 'Inventory is not initialized'; end if;
  insert into public.app_state (key,data) values ('delivery_batches','[]') on conflict (key) do nothing;
  select data into current_batches from public.app_state where key = 'delivery_batches' for update;
  if current_inventory is distinct from expected_inventory or current_batches is distinct from expected_batches then
    raise exception 'Stock or batches changed at another desk. Reload and try again.';
  end if;
  if jsonb_typeof(next_inventory) <> 'array' or jsonb_typeof(next_batches) <> 'array' then raise exception 'Invalid delivery state'; end if;
  if exists (select 1 from jsonb_array_elements(next_inventory) i where (i->>'stock')::numeric < 0 or (i->>'reserved')::numeric < 0 or (i->>'stock')::numeric < (i->>'reserved')::numeric) then
    raise exception 'Invalid stock quantities';
  end if;
  update public.app_state set data = next_inventory, updated_at = now() where key = 'inventory';
  update public.app_state set data = next_batches, updated_at = now() where key = 'delivery_batches';
end;
$$;
revoke all on function public.commit_delivery_stock(jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.commit_delivery_stock(jsonb,jsonb,jsonb,jsonb) to authenticated;
