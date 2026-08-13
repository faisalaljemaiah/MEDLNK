-- Reporting and moderation.
--
-- Additive: existing rows default to visible/unsuspended, so nothing already
-- posted changes behaviour.

-- Admin check, mirroring is_verified() from 0004 -----------------------------
-- Security definer so a policy can ask "is the caller an admin" without giving
-- the caller read access to other people's profiles.

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- Suspension -----------------------------------------------------------------
-- Deliberately routed through is_verified() rather than added to every policy:
-- every write in this schema is already gated on that one function, so a
-- suspension takes effect everywhere at once — posting, commenting, reacting,
-- following, messaging, answering — and a future table that follows the same
-- convention inherits it for free.

alter table public.profiles add column suspended_at timestamptz;
alter table public.profiles add column suspended_reason text;

create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select verified and suspended_at is null from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Content moderation state ----------------------------------------------------

alter table public.cases
  add column moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'removed'));

alter table public.comments
  add column moderation_status text not null default 'visible'
    check (moderation_status in ('visible', 'removed'));

-- Partial indexes: the common read is "everything still visible", and removal
-- is rare, so indexing only live rows keeps these small.
create index cases_visible_idx on public.cases (created_at desc)
  where moderation_status = 'visible';
create index comments_visible_idx on public.comments (case_id)
  where moderation_status = 'visible';

-- Removed content stops being publicly readable. Authors keep seeing their own
-- so a takedown isn't silent, and admins keep seeing everything so a decision
-- can be reviewed or reversed.
drop policy "cases_select_all" on public.cases;
create policy "cases_select_visible"
  on public.cases for select
  using (
    moderation_status = 'visible'
    or auth.uid() = author_id
    or public.is_admin()
  );

drop policy "comments_select_all" on public.comments;
create policy "comments_select_visible"
  on public.comments for select
  using (
    moderation_status = 'visible'
    or auth.uid() = user_id
    or public.is_admin()
  );

create policy "cases_update_admin"
  on public.cases for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "comments_update_admin"
  on public.comments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Reports ---------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,

  -- Exactly one target. A single nullable-columns table beats three near
  -- identical report tables, and the check keeps it honest.
  case_id uuid references public.cases (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reported_profile_id uuid references public.profiles (id) on delete cascade,

  reason text not null check (reason in (
    'patient_privacy',
    'incorrect_clinical_information',
    'harassment',
    'inappropriate_content',
    'misleading_information',
    'spam',
    'other'
  )),
  details text,

  status text not null default 'pending' check (status in (
    'pending',
    'reviewed',
    'approved',
    'removed',
    'escalated'
  )),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),

  constraint reports_single_target
    check (num_nonnulls(case_id, comment_id, reported_profile_id) = 1)
);

-- Queue reads are "oldest pending first"; partial so it stays small as the
-- resolved pile grows.
create index reports_pending_idx on public.reports (created_at)
  where status = 'pending';
create index reports_case_idx on public.reports (case_id);
create index reports_reporter_idx on public.reports (reporter_id);

-- One open report per person per target: a second submission is a duplicate,
-- not new signal. Partial so the same person can report again if a previous
-- report was resolved and the problem recurs.
create unique index reports_one_open_per_case
  on public.reports (reporter_id, case_id)
  where case_id is not null and status = 'pending';
create unique index reports_one_open_per_comment
  on public.reports (reporter_id, comment_id)
  where comment_id is not null and status = 'pending';
create unique index reports_one_open_per_profile
  on public.reports (reporter_id, reported_profile_id)
  where reported_profile_id is not null and status = 'pending';

alter table public.reports enable row level security;

-- Reporting is NOT gated on is_verified(). A patient-privacy breach should be
-- reportable by anyone who can see it, including a member still waiting on
-- verification — and a suspended user reporting content is not a threat worth
-- designing around.
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- Reporters see their own reports so they know it landed; admins see the queue.
-- Nobody else can enumerate what has been reported.
create policy "reports_select_own_or_admin"
  on public.reports for select
  using (auth.uid() = reporter_id or public.is_admin());

create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Audit log --------------------------------------------------------------------
-- Append-only from the app's point of view: there is no update or delete policy,
-- so a moderation decision cannot be quietly rewritten later.

create table public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_kind text not null check (target_kind in ('case', 'comment', 'profile', 'report')),
  target_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

create index moderation_events_created_idx on public.moderation_events (created_at desc);
create index moderation_events_target_idx on public.moderation_events (target_kind, target_id);

alter table public.moderation_events enable row level security;

create policy "moderation_events_select_admin"
  on public.moderation_events for select
  using (public.is_admin());

create policy "moderation_events_insert_admin"
  on public.moderation_events for insert
  with check (public.is_admin() and auth.uid() = actor_id);

grant execute on function public.is_admin() to anon, authenticated;
