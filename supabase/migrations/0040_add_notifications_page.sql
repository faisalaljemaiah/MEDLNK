-- Brings back an in-app notifications inbox — narrower than the one 0039
-- removed. Only three events land here: a new follower, a new comment, and
-- a new "like" (a reaction to one of the three clinical values — repost and
-- save are bookmarking/sharing, not the same "someone appreciated this"
-- signal, so they don't notify). Case updates, safety alerts and specialist
-- requests/answers stay push+email only, per the standing "no in-app bell"
-- decision for everything else.
--
-- notify_new_follower and notify_new_comment already exist (0036) and
-- already return the recipient id for push — this restores their
-- `insert into public.notifications` step alongside that, so no calling
-- Server Action needs to change. notify_new_reaction is new: reacting is the
-- one of these three events that had no notify_* function at all yet.

-- Guarded throughout (if not exists / drop-then-create / create or replace):
-- 0039 was meant to have dropped this table already, but on a project where
-- that migration was never actually pasted in, it's still sitting there from
-- 0008 with this exact shape — this has to be safe to run either way.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  body text not null,
  case_id uuid references public.cases (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
create index if not exists notifications_unread_idx on public.notifications (user_id)
  where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert policy: written only by the security-definer functions below.
-- If an old insert policy exists from before this table's history, drop it —
-- clients must never be able to mint their own notifications.
drop policy if exists "notifications_insert_own" on public.notifications;

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

  insert into public.notifications (user_id, type, body, actor_id)
  values (p_followee_id, 'new_follower', 'started following you', v_actor);

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

  insert into public.notifications (user_id, type, body, case_id, actor_id)
  values (v_case.author_id, 'new_comment', 'replied to your case', p_case_id, v_actor);

  return v_case.author_id;
end;
$$;

-- p_type is one of the three clinical reaction values (interesting,
-- changed_thinking, patient_safety) — the caller (toggleReactionAction)
-- only calls this for those, but the check is repeated here too, since a
-- security-definer function should never trust its caller alone for
-- something this cheap to verify directly.
create or replace function public.notify_new_reaction(p_case_id uuid, p_type text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.cases;
begin
  if p_type not in ('interesting', 'changed_thinking', 'patient_safety') then
    return null;
  end if;

  select * into v_case from public.cases where id = p_case_id;

  if v_case.id is null or v_case.author_id is null or v_case.author_id = v_actor then
    return null;
  end if;

  insert into public.notifications (user_id, type, body, case_id, actor_id)
  values (v_case.author_id, 'new_reaction', 'reacted to your case', p_case_id, v_actor);

  return v_case.author_id;
end;
$$;

revoke all on function public.notify_new_follower(uuid) from public;
revoke all on function public.notify_new_comment(uuid) from public;
revoke all on function public.notify_new_reaction(uuid, text) from public;

grant execute on function public.notify_new_follower(uuid) to authenticated;
grant execute on function public.notify_new_comment(uuid) to authenticated;
grant execute on function public.notify_new_reaction(uuid, text) to authenticated;
