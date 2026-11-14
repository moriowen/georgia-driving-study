-- Single-user capability-protected sync. The public API key alone cannot read
-- progress. Only this RPC is callable; underlying data has no client grants.
create schema if not exists driving_study;
revoke all on schema driving_study from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create table if not exists driving_study.settings (
 singleton boolean primary key default true check(singleton),
 key_hash text not null check(length(key_hash)=64)
);
create table if not exists driving_study.events (
 seq bigint generated always as identity primary key,
 event_id text unique not null,
 payload jsonb not null,
 received_at timestamptz not null default now()
);
alter table driving_study.settings enable row level security;
alter table driving_study.events enable row level security;
revoke all on driving_study.settings,driving_study.events from public,anon,authenticated;
create or replace function public.sync_driving_study(p_sync_key text,p_events jsonb default '[]'::jsonb,p_after bigint default 0)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare item jsonb; batch jsonb; latest bigint; field text;
begin
 if p_sync_key is null or p_sync_key !~ '^[a-f0-9]{64}$' or not exists (
  select 1 from driving_study.settings where singleton and key_hash=encode(extensions.digest(p_sync_key,'sha256'),'hex')
 ) then raise insufficient_privilege using message='Invalid connection key'; end if;
 if p_after is null or p_after<0 or jsonb_typeof(p_events) is distinct from 'array' or jsonb_array_length(p_events)>100 or octet_length(p_events::text)>250000 then
  raise invalid_parameter_value using message='Invalid sync batch';
 end if;
 -- Serialise writes and cursor snapshots. A later sequence must not be returned
 -- before an earlier transaction commits, or a client could skip an event.
 perform pg_catalog.pg_advisory_xact_lock(714936201);
 for item in select value from jsonb_array_elements(p_events) loop
  if jsonb_typeof(item) is distinct from 'object' or not (item ? 'id' and item ? 'ts' and item ? 'type')
   or coalesce(item->>'id','') !~ '^[-a-zA-Z0-9_:]{8,100}$'
   or coalesce(item->>'type','') not in ('answer','baseline','exam','reset')
   or jsonb_typeof(item->'ts') is distinct from 'number' or (item->>'ts')::numeric<0 or (item->>'ts')::numeric>8640000000000000
   or mod((item->>'ts')::numeric,1)<>0 or octet_length(item::text)>12000 then
   raise invalid_parameter_value using message='Invalid sync event';
  end if;
  if item->>'type' in ('answer','baseline') and (coalesce(item->>'qid','') !~ '^[a-f0-9]{12}$') then
   raise invalid_parameter_value using message='Invalid question identity';
  end if;
  if item->>'type'='answer' and (not (item ? 'correct') or jsonb_typeof(item->'correct') is distinct from 'boolean') then
   raise invalid_parameter_value using message='Invalid answer';
  end if;
  if item->>'type'='baseline' and jsonb_typeof(item->'record') is distinct from 'object' then
   raise invalid_parameter_value using message='Invalid baseline';
  end if;
  if item->>'type'='exam' and jsonb_typeof(item->'exam') is distinct from 'object' then
   raise invalid_parameter_value using message='Invalid exam';
  end if;
  if item->>'type'='baseline' then
   foreach field in array array['attempts','correct','wrong','streak','due'] loop
    if jsonb_typeof(item->'record'->field) is distinct from 'number' or (item->'record'->>field)::numeric<0
     or (item->'record'->>field)::numeric>8640000000000000 then
     raise invalid_parameter_value using message='Invalid baseline number';
    end if;
    if field<>'due' and mod((item->'record'->>field)::numeric,1)<>0 then raise invalid_parameter_value using message='Invalid baseline count'; end if;
   end loop;
   if (item->'record'->>'streak')::numeric>5 or (item->'record'->>'attempts')::numeric<>(item->'record'->>'correct')::numeric+(item->'record'->>'wrong')::numeric then
    raise invalid_parameter_value using message='Invalid baseline totals';
   end if;
  end if;
  if item->>'type'='exam' then
   if jsonb_typeof(item->'exam'->'date') is distinct from 'number' then raise invalid_parameter_value using message='Invalid exam date'; end if;
   foreach field in array array['rules','signs'] loop
    if jsonb_typeof(item->'exam'->field->'total') is distinct from 'number' or (item->'exam'->field->>'total')::numeric<>20
     or jsonb_typeof(item->'exam'->field->'correct') is distinct from 'number'
     or (item->'exam'->field->>'correct')::numeric<0 or (item->'exam'->field->>'correct')::numeric>20
     or mod((item->'exam'->field->>'correct')::numeric,1)<>0 then
     raise invalid_parameter_value using message='Invalid exam score';
    end if;
   end loop;
  end if;
  if exists(select 1 from driving_study.events where event_id=item->>'id' and payload<>item) then
   raise invalid_parameter_value using message='Conflicting event identity';
  end if;
  insert into driving_study.events(event_id,payload) values(item->>'id',item) on conflict(event_id) do nothing;
 end loop;
 select coalesce(jsonb_agg(jsonb_build_object('seq',t.seq,'event',t.payload) order by t.seq),'[]'::jsonb),coalesce(max(t.seq),p_after)
 into batch,latest from (select seq,payload from driving_study.events where seq>p_after order by seq limit 500) t;
 return jsonb_build_object('events',batch,'cursor',latest,'more',exists(select 1 from driving_study.events where seq>latest));
end $$;
revoke all on function public.sync_driving_study(text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.sync_driving_study(text,jsonb,bigint) to anon;
