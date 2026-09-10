-- Drops the in-app notification inbox. The user wants push (phone) and
-- email only — no in-app bell, no /notifications page.
--
-- The fan_out_*/notify_* functions from 0008/0012/0015/0036 stay: Server
-- Actions call them for their *return value* (the recipient id(s)) and feed
-- that straight into sendPushToUsers, entirely independent of the
-- notifications table. Each function below is dropped and recreated with
-- the `insert into public.notifications ... returning user_id` step
-- replaced by a plain `select`, so callers see the exact same signature and
-- the exact same recipients — only the side-effect row is gone.
--
-- One exception: fan_out_safety_alert used the notifications table itself as
-- its "already notified this case" ledger (`not exists (select 1 from
-- notifications ...)`), so a re-broadcast doesn't push twice. That ledger
-- moves to its own tiny table, safety_alert_pushes, which exists purely for
-- this dedupe check — no client ever reads or writes it directly.

create table public.safety_alert_pushes (
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

-- Written only by fan_out_safety_alert (security definer). No client-facing
-- policy at all — RLS on with zero policies denies every direct access.
alter table public.safety_alert_pushes enable row level security;

drop function if exists public.fan_out_case_update(uuid, text, text);

create function public.fan_out_case_update(
  p_case_id uuid,
  p_type text,
  p_body text
)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  return query
  select f.user_id
  from public.case_followers f
  where f.case_id = p_case_id
    and f.user_id is distinct from v_actor;
end;
$$;

revoke all on function public.fan_out_case_update(uuid, text, text) from public;
grant execute on function public.fan_out_case_update(uuid, text, text) to authenticated;

drop function if exists public.fan_out_safety_alert(uuid);

create function public.fan_out_safety_alert(p_case_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.cases;
begin
  select * into v_case from public.cases where id = p_case_id;

  if v_case.id is null or v_case.case_type <> 'safety_alert' then
    return;
  end if;

  if v_case.author_id is distinct from v_actor then
    return;
  end if;

  return query
  insert into public.safety_alert_pushes (case_id, user_id)
  select p_case_id, p.id
  from public.profiles p
  where p.verified
    and p.suspended_at is null
    and p.id is distinct from v_actor
    and not exists (
      select 1 from public.safety_alert_pushes s
      where s.case_id = p_case_id
        and s.user_id = p.id
    )
  returning user_id;
end;
$$;

revoke all on function public.fan_out_safety_alert(uuid) from public;
grant execute on function public.fan_out_safety_alert(uuid) to authenticated;

drop function if exists public.fan_out_specialist_request(uuid);

create function public.fan_out_specialist_request(p_request_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_req public.specialist_requests;
begin
  select * into v_req from public.specialist_requests where id = p_request_id;
  if v_req.id is null then
    return;
  end if;

  return query
  select p.id
  from public.profiles p
  where lower(trim(p.specialty)) = lower(trim(v_req.specialty))
    and p.verified
    and p.suspended_at is null
    and p.id is distinct from v_actor;
end;
$$;

revoke all on function public.fan_out_specialist_request(uuid) from public;
grant execute on function public.fan_out_specialist_request(uuid) to authenticated;

drop function if exists public.fan_out_specialist_answer(uuid);

create function public.fan_out_specialist_answer(p_request_id uuid)
returns setof uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_req public.specialist_requests;
begin
  select * into v_req from public.specialist_requests where id = p_request_id;
  if v_req.id is null then
    return;
  end if;

  return query
  select v_req.requester_id
  where v_req.requester_id is distinct from v_actor;

  return query
  select f.user_id
  from public.case_followers f
  where f.case_id = v_req.case_id
    and f.user_id is distinct from v_actor
    and f.user_id is distinct from v_req.requester_id;
end;
$$;

revoke all on function public.fan_out_specialist_answer(uuid) from public;
grant execute on function public.fan_out_specialist_answer(uuid) to authenticated;

create or replace function public.notify_new_follower(p_followee_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  if p_followee_id is null or p_followee_id = v_actor then
    return null;
  end if;

  return p_followee_id;
end;
$$;

create or replace function public.notify_new_comment(p_case_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.cases;
begin
  select * into v_case from public.cases where id = p_case_id;

  if v_case.id is null or v_case.author_id is null or v_case.author_id = v_actor then
    return null;
  end if;

  return v_case.author_id;
end;
$$;

create or replace function public.notify_new_message(p_conversation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_conv public.conversations;
  v_recipient uuid;
begin
  select * into v_conv from public.conversations where id = p_conversation_id;
  if v_conv.id is null then
    return null;
  end if;

  v_recipient := case
    when v_conv.user_a = v_actor then v_conv.user_b
    when v_conv.user_b = v_actor then v_conv.user_a
    else null
  end;

  return v_recipient;
end;
$$;

revoke all on function public.notify_new_follower(uuid) from public;
revoke all on function public.notify_new_comment(uuid) from public;
revoke all on function public.notify_new_message(uuid) from public;

grant execute on function public.notify_new_follower(uuid) to authenticated;
grant execute on function public.notify_new_comment(uuid) to authenticated;
grant execute on function public.notify_new_message(uuid) to authenticated;

drop table public.notifications;
