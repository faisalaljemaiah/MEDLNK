-- Real (Web Push) push notifications, on top of the in-app notifications
-- table from 0008. Two pieces:
--
-- 1. push_subscriptions: one row per browser/device a member has opted push
--    into (a member can have several — phone, laptop). Written by the client
--    itself after the browser grants Notification permission, so unlike
--    notifications this table needs an ordinary insert policy, not a
--    security-definer function.
--
-- 2. The four existing fan_out_* functions go from `returns void` to
--    `returns setof uuid`, surfacing exactly which users got a row inserted
--    so the calling Server Action can dispatch a push to that same set
--    without a second query. Postgres won't let `create or replace` change a
--    return type, so each is dropped and recreated; the guard clauses and
--    dedupe logic are otherwise untouched. Three new single-recipient
--    notify_* functions cover events that don't already fan out — follow,
--    comment, message — returning the one recipient id for the same reason.

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null default 'web' check (kind in ('web', 'fcm')),
  endpoint text not null,
  p256dh text,
  auth_key text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

-- Needed for the upsert (onConflict: user_id,endpoint) a browser re-registering
-- an existing subscription performs — without this the conflict branch of the
-- upsert has no policy to satisfy and the whole call fails.
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- fan_out_case_update: same body as 0008, now returning who it inserted for.
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
  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select f.user_id, p_type, p_body, p_case_id, v_actor
  from public.case_followers f
  where f.case_id = p_case_id
    and f.user_id is distinct from v_actor
  returning user_id;
end;
$$;

revoke all on function public.fan_out_case_update(uuid, text, text) from public;
grant execute on function public.fan_out_case_update(uuid, text, text) to authenticated;

-- fan_out_safety_alert: same body as 0015, now returning who it inserted for.
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
  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select p.id,
         'safety_alert',
         'Safety alert: ' || v_case.title,
         p_case_id,
         v_actor
  from public.profiles p
  where p.verified
    and p.suspended_at is null
    and p.id is distinct from v_actor
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id
        and n.case_id = p_case_id
        and n.type = 'safety_alert'
    )
  returning user_id;
end;
$$;

revoke all on function public.fan_out_safety_alert(uuid) from public;
grant execute on function public.fan_out_safety_alert(uuid) to authenticated;

-- fan_out_specialist_request: same body as 0012, now returning who it inserted for.
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
  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select p.id,
         'specialist_request',
         'A case is waiting for a ' || v_req.specialty || ' opinion',
         v_req.case_id,
         v_actor
  from public.profiles p
  where lower(trim(p.specialty)) = lower(trim(v_req.specialty))
    and p.verified
    and p.suspended_at is null
    and p.id is distinct from v_actor
  returning user_id;
end;
$$;

revoke all on function public.fan_out_specialist_request(uuid) from public;
grant execute on function public.fan_out_specialist_request(uuid) to authenticated;

-- fan_out_specialist_answer: same body as 0012, now returning who it inserted
-- for. Two RETURN QUERY calls accumulate into one result set.
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
  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select v_req.requester_id,
         'specialist_answer',
         'A ' || v_req.specialty || ' specialist answered your question',
         v_req.case_id,
         v_actor
  where v_req.requester_id is distinct from v_actor
  returning user_id;

  return query
  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select f.user_id,
         'specialist_answer',
         'A ' || v_req.specialty || ' specialist answered on a case you follow',
         v_req.case_id,
         v_actor
  from public.case_followers f
  where f.case_id = v_req.case_id
    and f.user_id is distinct from v_actor
    and f.user_id is distinct from v_req.requester_id
  returning user_id;
end;
$$;

revoke all on function public.fan_out_specialist_answer(uuid) from public;
grant execute on function public.fan_out_specialist_answer(uuid) to authenticated;

-- New single-recipient notifications. The caller already knows who the one
-- recipient is meant to be (the followee, the case author, the other side of
-- the conversation) — these exist only because notifications has no client
-- insert policy, and hand that same id back so the caller can dispatch a push
-- without a second lookup.

create function public.notify_new_follower(p_followee_id uuid)
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

  insert into public.notifications (user_id, type, body, actor_id)
  values (p_followee_id, 'new_follower', 'started following you', v_actor);

  return p_followee_id;
end;
$$;

create function public.notify_new_comment(p_case_id uuid)
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

  insert into public.notifications (user_id, type, body, case_id, actor_id)
  values (v_case.author_id, 'new_comment', 'replied to your case', p_case_id, v_actor);

  return v_case.author_id;
end;
$$;

create function public.notify_new_message(p_conversation_id uuid)
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

  if v_recipient is null then
    return null;
  end if;

  insert into public.notifications (user_id, type, body, actor_id)
  values (v_recipient, 'new_message', 'sent you a message', v_actor);

  return v_recipient;
end;
$$;

revoke all on function public.notify_new_follower(uuid) from public;
revoke all on function public.notify_new_comment(uuid) from public;
revoke all on function public.notify_new_message(uuid) from public;

grant execute on function public.notify_new_follower(uuid) to authenticated;
grant execute on function public.notify_new_comment(uuid) to authenticated;
grant execute on function public.notify_new_message(uuid) to authenticated;
