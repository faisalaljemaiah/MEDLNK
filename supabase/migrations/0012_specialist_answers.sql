-- Ask a Specialist (spec §10).
--
-- A case reaches the people who happen to scroll past it. Some cases need the
-- person who does this every day. This routes a specific question on a case to
-- a named specialty, notifies the clinicians in it, and shows their answers on
-- the case attributed and badged — so a reader can tell "a cardiologist said
-- this" from "somebody said this".
--
-- profiles.specialty is free text (the onboarding form takes a string), so
-- every comparison here is on lower(trim(...)). Tightening that to a controlled
-- vocabulary later is a data migration on one column, not a redesign.

-- Specialty match, mirroring is_verified()/is_admin() from 0004/0009 ----------
-- Security definer so a policy can ask "is the caller in this specialty"
-- without the caller needing to read profiles through RLS inside a policy.

create function public.is_specialist_in(p_specialty text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select lower(trim(specialty)) = lower(trim(p_specialty))
      and verified
      and suspended_at is null
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

-- Requests ---------------------------------------------------------------------

create table public.specialist_requests (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  specialty text not null,
  question text not null,
  -- Two states, not three. An "answered" state would have to be written by the
  -- answering specialist, who is not the requester and so cannot update this
  -- row — the write would silently no-op under RLS and the status would drift
  -- from reality. Whether a request has answers is a fact about the answers
  -- table; only "the person who asked considers this done" needs storing.
  status text not null default 'open'
    check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

-- One ask per specialty per case. Anyone verified may ask — the question is
-- often the reader's, not the author's — and this is what keeps that from
-- turning into five people queuing the same cardiology request. The second
-- person to want one sees the first.
create unique index specialist_requests_one_per_specialty
  on public.specialist_requests (case_id, lower(trim(specialty)));

create index specialist_requests_open_idx
  on public.specialist_requests (lower(trim(specialty)), created_at)
  where status = 'open';
create index specialist_requests_case_idx
  on public.specialist_requests (case_id);

alter table public.specialist_requests enable row level security;

create policy "specialist_requests_select_all"
  on public.specialist_requests for select
  using (true);

create policy "specialist_requests_insert_verified_own"
  on public.specialist_requests for insert
  with check (auth.uid() = requester_id and public.is_verified());

-- The person who asked can close it; nobody else can touch it.
create policy "specialist_requests_update_own"
  on public.specialist_requests for update
  using (auth.uid() = requester_id)
  with check (auth.uid() = requester_id);

create policy "specialist_requests_delete_own"
  on public.specialist_requests for delete
  using (auth.uid() = requester_id);

-- Answers ------------------------------------------------------------------------

create table public.specialist_answers (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.specialist_requests (id) on delete cascade,
  responder_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  -- Same shape as cases/comments in 0009 so moderation reaches this content too.
  moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'removed')),
  created_at timestamptz not null default now(),
  -- One answer per specialist per request. A specialist who wants to say more
  -- edits theirs; the thread stays a set of opinions, not a conversation.
  unique (request_id, responder_id)
);

create index specialist_answers_request_idx
  on public.specialist_answers (request_id, created_at);

alter table public.specialist_answers enable row level security;

create policy "specialist_answers_select_visible"
  on public.specialist_answers for select
  using (
    moderation_status = 'visible'
    or auth.uid() = responder_id
    or public.is_admin()
  );

-- The badge on this answer claims a specialty. That claim is enforced here, at
-- write time, rather than by the UI choosing who sees the form — otherwise
-- "Cardiology" next to an answer would mean only "this person clicked the
-- cardiology button".
create policy "specialist_answers_insert_matching_specialty"
  on public.specialist_answers for insert
  with check (
    auth.uid() = responder_id
    and public.is_verified()
    and exists (
      select 1 from public.specialist_requests r
      where r.id = request_id
        and r.status <> 'closed'
        and public.is_specialist_in(r.specialty)
    )
  );

create policy "specialist_answers_update_own"
  on public.specialist_answers for update
  using (auth.uid() = responder_id)
  with check (auth.uid() = responder_id);

create policy "specialist_answers_delete_own"
  on public.specialist_answers for delete
  using (auth.uid() = responder_id);

create policy "specialist_answers_update_admin"
  on public.specialist_answers for update
  using (public.is_admin())
  with check (public.is_admin());

-- Notifications ------------------------------------------------------------------
-- Both are security definer because notifications has no client insert policy
-- (0008). Both exclude the actor, and both are scoped by an explicit predicate
-- — an unscoped fan-out here would page the entire platform.

-- Tells the specialty a question is waiting. Verified, unsuspended members of
-- that specialty only; the requester never notifies themselves.
create function public.fan_out_specialist_request(p_request_id uuid)
returns void
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
    and p.id is distinct from v_actor;
end;
$$;

-- Tells the person who asked, and anyone following the case, that an answer
-- landed. Two scoped inserts rather than one broad one.
create function public.fan_out_specialist_answer(p_request_id uuid)
returns void
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

  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select v_req.requester_id,
         'specialist_answer',
         'A ' || v_req.specialty || ' specialist answered your question',
         v_req.case_id,
         v_actor
  where v_req.requester_id is distinct from v_actor;

  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select f.user_id,
         'specialist_answer',
         'A ' || v_req.specialty || ' specialist answered on a case you follow',
         v_req.case_id,
         v_actor
  from public.case_followers f
  where f.case_id = v_req.case_id
    and f.user_id is distinct from v_actor
    and f.user_id is distinct from v_req.requester_id;
end;
$$;

revoke all on function public.fan_out_specialist_request(uuid) from public;
revoke all on function public.fan_out_specialist_answer(uuid) from public;

grant execute on function public.is_specialist_in(text) to anon, authenticated;
grant execute on function public.fan_out_specialist_request(uuid) to authenticated;
grant execute on function public.fan_out_specialist_answer(uuid) to authenticated;
