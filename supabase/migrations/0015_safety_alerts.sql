-- Safety Alerts (spec §17).
--
-- The `safety_alert` post type has existed since 0008 and does nothing a
-- clinical pearl doesn't: it gets a red badge and then waits its turn in a
-- reverse-chronological feed. A hazard other clinicians need to know about
-- *now* — a look-alike packaging change, a recalled device, a protocol that is
-- actively hurting people — cannot depend on everyone scrolling far enough.
--
-- So an alert does two things an ordinary post doesn't: it reaches everyone,
-- and it stays in front of a reader until they acknowledge it.

-- Acknowledgements --------------------------------------------------------------
-- Not a reaction. A reaction says what you thought of a case; this says "I have
-- seen this and it is no longer news to me", and it is what takes the alert off
-- your banner. Keeping it separate also means the alert banner can't be
-- dismissed by accidentally tapping 💡.

create table public.safety_alert_acks (
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create index safety_alert_acks_user_idx
  on public.safety_alert_acks (user_id, created_at desc);

alter table public.safety_alert_acks enable row level security;

-- Own rows only. Whether a *particular* clinician has read a safety alert is
-- exactly the sort of thing that turns into a compliance dashboard, and this
-- schema shouldn't make that easy by accident.
create policy "safety_alert_acks_select_own"
  on public.safety_alert_acks for select
  using (auth.uid() = user_id);

-- Not gated on is_verified(): dismissing a banner is not publishing, and a
-- member still waiting on licence approval can read the feed.
create policy "safety_alert_acks_insert_own"
  on public.safety_alert_acks for insert
  with check (auth.uid() = user_id);

create policy "safety_alert_acks_delete_own"
  on public.safety_alert_acks for delete
  using (auth.uid() = user_id);

-- Fan-out ------------------------------------------------------------------------
-- The one deliberately platform-wide fan-out in this schema.
--
-- Every other fan_out_* here is scoped by an explicit predicate, and the
-- comments say so, because an unscoped one is a bug — 0008's nearly notified
-- every follower on the platform. This is the exception, and it is the whole
-- point of the feature: a hazard that only reaches the author's followers is
-- not an alert. It is still bounded — verified, unsuspended, not the author —
-- and it refuses to fire for anything that isn't a safety alert, so it can't be
-- borrowed to broadcast an ordinary post.

create function public.fan_out_safety_alert(p_case_id uuid)
returns void
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

  -- Only the author can broadcast their own alert. Without this any member
  -- could re-fire someone else's alert at the whole platform, repeatedly.
  if v_case.author_id is distinct from v_actor then
    return;
  end if;

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
    -- Re-broadcasting an alert must not stack duplicates in an inbox.
    and not exists (
      select 1 from public.notifications n
      where n.user_id = p.id
        and n.case_id = p_case_id
        and n.type = 'safety_alert'
    );
end;
$$;

revoke all on function public.fan_out_safety_alert(uuid) from public;
grant execute on function public.fan_out_safety_alert(uuid) to authenticated;
