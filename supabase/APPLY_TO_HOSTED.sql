-- MEDLNK — everything the hosted project is still missing, in one paste.
--
-- Migrations 0005 (storage), 0007 (messaging), 0008 (interactive cases),
-- 0009 (reports/moderation), 0010 (clinical reactions), 0011 (comment labels)
-- and 0012 (Ask a Specialist) have never been applied to the hosted Supabase
-- project. Until they are, image upload fails with "Bucket not found",
-- /messages shows an empty inbox, every interactive feature (What Would You
-- Do?, Case Evolution, Follow Case, Blind Cases, Near Miss, notifications)
-- stays inert, there is no way to report content or suspend a user, the
-- discussion thread and Ask a Specialist report themselves as unavailable, and
-- reacting to or replying to a case fails outright — the app now writes
-- 💡/🧠/⚠️ and a reply label, neither of which the live schema accepts.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file ->
--   Run. The editor wraps it in a transaction, so it either applies completely
--   or not at all. The last statement prints a checklist of what now exists.
--
-- This file is a re-runnable union of those migrations, not a
-- replacement for them: supabase/migrations/ stays the canonical, ordered
-- history, and this exists purely because the hosted project is applied by
-- hand. Every statement is guarded (if not exists / drop policy if exists /
-- create or replace), so running it a second time is a no-op rather than an
-- error — safe if you are unsure how much of it already went through.
--
-- Prerequisite: 0001-0004 and 0006 are already applied (public.profiles,
-- public.cases and public.is_verified() must exist). If they are not, run
-- supabase/migrations/0001..0004 and 0006 first, in order.
--
-- After this runs, deploy the Edge Functions too — they are a separate step
-- and nothing below affects them:
--   supabase secrets set ANTHROPIC_API_KEY=...
--   supabase functions deploy generate-recap
--   supabase functions deploy scan-identifiers
--   supabase functions deploy polish-text

-- ============================================================================
-- 0005_storage.sql — case image bucket
-- ============================================================================
-- Convention: object path is "<author_id>/<uuid>.<ext>" so ownership can be
-- checked from the path itself without an extra lookup table.

insert into storage.buckets (id, name, public)
values ('case-images', 'case-images', true)
on conflict (id) do nothing;

drop policy if exists "case_images_read_all" on storage.objects;
create policy "case_images_read_all"
  on storage.objects for select
  using (bucket_id = 'case-images');

drop policy if exists "case_images_insert_verified_own_folder" on storage.objects;
create policy "case_images_insert_verified_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'case-images'
    and public.is_verified()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "case_images_delete_own_folder" on storage.objects;
create policy "case_images_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'case-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 0007_messaging.sql — 1:1 direct messages
-- ============================================================================
-- A conversation is the unordered pair of participants, stored in canonical
-- (user_a < user_b) order so there's exactly one row per pair — callers must
-- insert with the smaller uuid as user_a.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index if not exists conversations_user_a_idx on public.conversations (user_a);
create index if not exists conversations_user_b_idx on public.conversations (user_b);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx
  on public.messages (conversation_id, created_at);

-- Same shape as reactions/comments/follows in 0004_rls.sql: readable only by
-- participants, writable only by a verified participant, reusing
-- public.is_verified() defined there.

alter table public.conversations enable row level security;

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
  on public.conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "conversations_insert_verified_participant" on public.conversations;
create policy "conversations_insert_verified_participant"
  on public.conversations for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and public.is_verified()
  );

alter table public.messages enable row level security;

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

drop policy if exists "messages_insert_verified_participant" on public.messages;
create policy "messages_insert_verified_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_verified()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- ============================================================================
-- 0008_interactive_cases.sql — post types, questions, evolution, follow
-- ============================================================================
-- Everything here is additive. New columns are defaulted or nullable so every
-- existing case row stays valid and the current UI keeps rendering untouched.

alter table public.cases
  add column if not exists case_type text not null default 'clinical_case'
    check (case_type in (
      'clinical_case',
      'what_would_you_do',
      'blind_case',
      'case_evolution',
      'near_miss',
      'safety_alert',
      'saw_this_today',
      'clinical_pearl',
      'things_i_wish_i_knew',
      'case_vs_case',
      'research_finding'
    ));

-- Near Miss answers the five patient-safety prompts. Sparse and only present
-- on one post type, so jsonb rather than five mostly-null columns.
-- Shape: { almost, caught_by, prevention, learned, system_change }
alter table public.cases add column if not exists near_miss jsonb;

-- Blind Cases hide the closing sections until the reader chooses to reveal.
alter table public.cases
  add column if not exists reveal_mode text not null default 'none'
    check (reveal_mode in ('none', 'staged'));

create index if not exists cases_case_type_idx on public.cases (case_type);

-- Interactive question ------------------------------------------------------
-- v1 is one question per case (see the unique constraint). Lifting that to a
-- multi-step stem later means dropping the constraint and adding a position
-- column — no data migration.

create table if not exists public.case_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  prompt text not null,
  explanation text,
  reasoning text,
  evidence text,
  -- Authors decide whether a reader may revise after seeing the distribution.
  allow_change boolean not null default false,
  created_at timestamptz not null default now(),
  unique (case_id)
);

create table if not exists public.case_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.case_questions (id) on delete cascade,
  body text not null,
  is_correct boolean not null default false,
  position int not null,
  unique (question_id, position)
);

create index if not exists case_options_question_idx
  on public.case_options (question_id, position);

create table if not exists public.case_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.case_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null references public.case_options (id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create index if not exists case_attempts_question_idx
  on public.case_attempts (question_id);
create index if not exists case_attempts_user_idx
  on public.case_attempts (user_id, created_at desc);

-- Case Evolution ------------------------------------------------------------

create table if not exists public.case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  stage text not null,
  body text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists case_updates_case_idx
  on public.case_updates (case_id, position, created_at);

-- Follow Case ---------------------------------------------------------------

create table if not exists public.case_followers (
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create index if not exists case_followers_user_idx
  on public.case_followers (user_id, created_at desc);

-- Notifications -------------------------------------------------------------
-- Generic on purpose: `type` widens without a schema change as §24 fills in.

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

-- RLS -----------------------------------------------------------------------
-- Same shape as 0004: readable by everyone (the feed works signed out), writable
-- only by a verified author of the parent case.

alter table public.case_questions enable row level security;

drop policy if exists "case_questions_select_all" on public.case_questions;
create policy "case_questions_select_all"
  on public.case_questions for select
  using (true);

drop policy if exists "case_questions_write_own_case" on public.case_questions;
create policy "case_questions_write_own_case"
  on public.case_questions for insert
  with check (
    public.is_verified()
    and exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

drop policy if exists "case_questions_update_own_case" on public.case_questions;
create policy "case_questions_update_own_case"
  on public.case_questions for update
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

alter table public.case_options enable row level security;

drop policy if exists "case_options_select_all" on public.case_options;
create policy "case_options_select_all"
  on public.case_options for select
  using (true);

drop policy if exists "case_options_write_own_case" on public.case_options;
create policy "case_options_write_own_case"
  on public.case_options for insert
  with check (
    public.is_verified()
    and exists (
      select 1
      from public.case_questions q
      join public.cases c on c.id = q.case_id
      where q.id = question_id and c.author_id = auth.uid()
    )
  );

-- Keeping the answer out of the browser.
--
-- RLS is row-level, so a "select all" policy would happily hand `is_correct` to
-- anyone who asks — the reveal would be one devtools request away, and hiding it
-- in the UI would be theatre. Column privileges are the actual control: the
-- client roles can read everything about an option EXCEPT whether it is right.
-- Grading goes through submit_case_answer() below, which is security definer and
-- so reads the column as the owner.
revoke select on public.case_options from anon, authenticated;
grant select (id, question_id, body, position) on public.case_options to anon, authenticated;

alter table public.case_attempts enable row level security;

-- An attempt is the reader's own answer. Aggregate distribution is exposed
-- separately by case_answer_distribution(), which is security definer.
drop policy if exists "case_attempts_select_own" on public.case_attempts;
create policy "case_attempts_select_own"
  on public.case_attempts for select
  using (auth.uid() = user_id);

alter table public.case_updates enable row level security;

drop policy if exists "case_updates_select_all" on public.case_updates;
create policy "case_updates_select_all"
  on public.case_updates for select
  using (true);

drop policy if exists "case_updates_insert_own_case" on public.case_updates;
create policy "case_updates_insert_own_case"
  on public.case_updates for insert
  with check (
    auth.uid() = author_id
    and public.is_verified()
    and exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

drop policy if exists "case_updates_delete_own" on public.case_updates;
create policy "case_updates_delete_own"
  on public.case_updates for delete
  using (auth.uid() = author_id);

alter table public.case_followers enable row level security;

drop policy if exists "case_followers_select_own" on public.case_followers;
create policy "case_followers_select_own"
  on public.case_followers for select
  using (auth.uid() = user_id);

drop policy if exists "case_followers_insert_own" on public.case_followers;
create policy "case_followers_insert_own"
  on public.case_followers for insert
  with check (auth.uid() = user_id);

drop policy if exists "case_followers_delete_own" on public.case_followers;
create policy "case_followers_delete_own"
  on public.case_followers for delete
  using (auth.uid() = user_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Marking read is the only field a recipient may change; the using/with check
-- pair keeps a row from being reassigned to someone else.
drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert policy: notifications are written by fan_out_case_update() below,
-- which is security definer. Clients must never mint their own.

-- Functions -----------------------------------------------------------------

-- Records an answer and reports whether it was right. Security definer because
-- case_options.is_correct is not readable by the caller — this is the only path
-- by which correctness is revealed, and it only reveals it *after* the attempt
-- is stored.
create or replace function public.submit_case_answer(p_question_id uuid, p_option_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_correct boolean;
  v_allow_change boolean;
  v_existing uuid;
begin
  if v_user is null then
    raise exception 'Not signed in';
  end if;

  -- The option must belong to the question being answered, or a caller could
  -- submit a correct option borrowed from a different case.
  select o.is_correct into v_correct
  from public.case_options o
  where o.id = p_option_id and o.question_id = p_question_id;

  if v_correct is null then
    raise exception 'Option does not belong to that question';
  end if;

  select q.allow_change into v_allow_change
  from public.case_questions q
  where q.id = p_question_id;

  select a.id into v_existing
  from public.case_attempts a
  where a.question_id = p_question_id and a.user_id = v_user;

  if v_existing is not null then
    if not coalesce(v_allow_change, false) then
      -- Already answered and the author didn't allow revision: report the
      -- stored result rather than overwriting it.
      select a.is_correct into v_correct
      from public.case_attempts a
      where a.id = v_existing;
      return v_correct;
    end if;

    update public.case_attempts
      set option_id = p_option_id,
          is_correct = v_correct,
          updated_at = now()
      where id = v_existing;
    return v_correct;
  end if;

  insert into public.case_attempts (question_id, user_id, option_id, is_correct)
  values (p_question_id, v_user, p_option_id, v_correct);

  return v_correct;
end;
$$;

-- Per-option answer counts for a question. Security definer so it can aggregate
-- across every attempt while case_attempts itself stays private to its owner —
-- callers get counts, never who answered what.
create or replace function public.case_answer_distribution(p_question_id uuid)
returns table (option_id uuid, votes bigint)
language sql
security definer
set search_path = public
as $$
  select o.id, count(a.id)
  from public.case_options o
  left join public.case_attempts a on a.option_id = o.id
  where o.question_id = p_question_id
  group by o.id
$$;

-- Notifies every follower of a case (except the actor) that something happened.
-- Security definer because notifications has no client insert policy.
create or replace function public.fan_out_case_update(
  p_case_id uuid,
  p_type text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
begin
  insert into public.notifications (user_id, type, body, case_id, actor_id)
  select f.user_id, p_type, p_body, p_case_id, v_actor
  from public.case_followers f
  where f.case_id = p_case_id
    and f.user_id is distinct from v_actor;
end;
$$;

revoke all on function public.submit_case_answer(uuid, uuid) from public;
revoke all on function public.case_answer_distribution(uuid) from public;
revoke all on function public.fan_out_case_update(uuid, text, text) from public;

grant execute on function public.submit_case_answer(uuid, uuid) to authenticated;
grant execute on function public.case_answer_distribution(uuid) to anon, authenticated;
grant execute on function public.fan_out_case_update(uuid, text, text) to authenticated;

-- ============================================================================
-- 0009_reports_moderation.sql — reports, content removal, suspension, audit log
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

alter table public.profiles add column if not exists suspended_at timestamptz;
alter table public.profiles add column if not exists suspended_reason text;

-- Suspension is routed through is_verified() rather than added to every
-- policy, so it takes effect on every write in the schema at once.
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

alter table public.cases add column if not exists moderation_status text
  not null default 'visible' check (moderation_status in ('visible', 'removed'));
alter table public.comments add column if not exists moderation_status text
  not null default 'visible' check (moderation_status in ('visible', 'removed'));

create index if not exists cases_visible_idx on public.cases (created_at desc)
  where moderation_status = 'visible';
create index if not exists comments_visible_idx on public.comments (case_id)
  where moderation_status = 'visible';

drop policy if exists "cases_select_all" on public.cases;
drop policy if exists "cases_select_visible" on public.cases;
create policy "cases_select_visible"
  on public.cases for select
  using (
    moderation_status = 'visible'
    or auth.uid() = author_id
    or public.is_admin()
  );

drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_select_visible" on public.comments;
create policy "comments_select_visible"
  on public.comments for select
  using (
    moderation_status = 'visible'
    or auth.uid() = user_id
    or public.is_admin()
  );

drop policy if exists "cases_update_admin" on public.cases;
create policy "cases_update_admin"
  on public.cases for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "comments_update_admin" on public.comments;
create policy "comments_update_admin"
  on public.comments for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  comment_id uuid references public.comments (id) on delete cascade,
  reported_profile_id uuid references public.profiles (id) on delete cascade,
  reason text not null check (reason in (
    'patient_privacy', 'incorrect_clinical_information', 'harassment',
    'inappropriate_content', 'misleading_information', 'spam', 'other'
  )),
  details text,
  status text not null default 'pending' check (status in (
    'pending', 'reviewed', 'approved', 'removed', 'escalated'
  )),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  reviewer_note text,
  created_at timestamptz not null default now(),
  constraint reports_single_target
    check (num_nonnulls(case_id, comment_id, reported_profile_id) = 1)
);

create index if not exists reports_pending_idx on public.reports (created_at)
  where status = 'pending';
create index if not exists reports_case_idx on public.reports (case_id);
create index if not exists reports_reporter_idx on public.reports (reporter_id);

create unique index if not exists reports_one_open_per_case
  on public.reports (reporter_id, case_id)
  where case_id is not null and status = 'pending';
create unique index if not exists reports_one_open_per_comment
  on public.reports (reporter_id, comment_id)
  where comment_id is not null and status = 'pending';
create unique index if not exists reports_one_open_per_profile
  on public.reports (reporter_id, reported_profile_id)
  where reported_profile_id is not null and status = 'pending';

alter table public.reports enable row level security;

-- Not gated on is_verified(): a privacy breach should be reportable by anyone
-- who can see it, including a member still waiting on approval.
drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "reports_select_own_or_admin" on public.reports;
create policy "reports_select_own_or_admin"
  on public.reports for select
  using (auth.uid() = reporter_id or public.is_admin());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

-- Append-only audit log: no update/delete policy, so a moderation decision
-- cannot be quietly rewritten later.
create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_kind text not null check (target_kind in ('case', 'comment', 'profile', 'report')),
  target_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists moderation_events_created_idx
  on public.moderation_events (created_at desc);
create index if not exists moderation_events_target_idx
  on public.moderation_events (target_kind, target_id);

alter table public.moderation_events enable row level security;

drop policy if exists "moderation_events_select_admin" on public.moderation_events;
create policy "moderation_events_select_admin"
  on public.moderation_events for select
  using (public.is_admin());

drop policy if exists "moderation_events_insert_admin" on public.moderation_events;
create policy "moderation_events_insert_admin"
  on public.moderation_events for insert
  with check (public.is_admin() and auth.uid() = actor_id);

grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================================
-- 0010_clinical_reactions.sql — 💡 / 🧠 / ⚠️ replace the bare like
-- ============================================================================
-- This is the one section here that rewrites existing rows rather than only
-- adding to the schema. Every stored 'like' becomes 'interesting' — the closest
-- honest reading of a like, and it keeps historical rows counted instead of
-- orphaning them under a value the new constraint rejects.
--
-- Safe on re-run: the second pass matches no rows. Safe against the
-- unique (case_id, user_id, type) constraint: 'interesting' did not exist
-- before this, so no row can collide with itself.

update public.reactions set type = 'interesting' where type = 'like';

alter table public.reactions drop constraint if exists reactions_type_check;

alter table public.reactions add constraint reactions_type_check
  check (type in (
    'repost',
    'save',
    'interesting',
    'changed_thinking',
    'patient_safety'
  ));

-- Serves the profile's "marked" tab, which asks what one user marked across
-- every case — the opposite of the per-case read reactions_case_id_idx covers.
create index if not exists reactions_user_type_idx
  on public.reactions (user_id, type);

-- ============================================================================
-- 0011_comment_labels.sql — what kind of reply is this
-- ============================================================================
-- Nullable, and null is explicitly allowed by the check: every comment written
-- before this stays valid, and an unlabelled reply stays a perfectly good
-- reply. comments_update_own (0004) already covers relabelling.

alter table public.comments
  add column if not exists label text;

alter table public.comments drop constraint if exists comments_label_check;

alter table public.comments add constraint comments_label_check
  check (label is null or label in (
    'agree',
    'differ',
    'question',
    'teaching',
    'evidence'
  ));

-- ============================================================================
-- 0012_specialist_answers.sql — Ask a Specialist
-- ============================================================================
-- Specialty match, mirroring is_verified()/is_admin() from 0004/0009 ----------
-- Security definer so a policy can ask "is the caller in this specialty"
-- without the caller needing to read profiles through RLS inside a policy.

create or replace function public.is_specialist_in(p_specialty text)
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

create table if not exists public.specialist_requests (
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
create unique index if not exists specialist_requests_one_per_specialty
  on public.specialist_requests (case_id, lower(trim(specialty)));

create index if not exists specialist_requests_open_idx
  on public.specialist_requests (lower(trim(specialty)), created_at)
  where status = 'open';
create index if not exists specialist_requests_case_idx
  on public.specialist_requests (case_id);

alter table public.specialist_requests enable row level security;

drop policy if exists "specialist_requests_select_all" on public.specialist_requests;
create policy "specialist_requests_select_all"
  on public.specialist_requests for select
  using (true);

drop policy if exists "specialist_requests_insert_verified_own" on public.specialist_requests;
create policy "specialist_requests_insert_verified_own"
  on public.specialist_requests for insert
  with check (auth.uid() = requester_id and public.is_verified());

-- The person who asked can close it; nobody else can touch it.
drop policy if exists "specialist_requests_update_own" on public.specialist_requests;
create policy "specialist_requests_update_own"
  on public.specialist_requests for update
  using (auth.uid() = requester_id)
  with check (auth.uid() = requester_id);

drop policy if exists "specialist_requests_delete_own" on public.specialist_requests;
create policy "specialist_requests_delete_own"
  on public.specialist_requests for delete
  using (auth.uid() = requester_id);

-- Answers ------------------------------------------------------------------------

create table if not exists public.specialist_answers (
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

create index if not exists specialist_answers_request_idx
  on public.specialist_answers (request_id, created_at);

alter table public.specialist_answers enable row level security;

drop policy if exists "specialist_answers_select_visible" on public.specialist_answers;
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
drop policy if exists "specialist_answers_insert_matching_specialty" on public.specialist_answers;
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

drop policy if exists "specialist_answers_update_own" on public.specialist_answers;
create policy "specialist_answers_update_own"
  on public.specialist_answers for update
  using (auth.uid() = responder_id)
  with check (auth.uid() = responder_id);

drop policy if exists "specialist_answers_delete_own" on public.specialist_answers;
create policy "specialist_answers_delete_own"
  on public.specialist_answers for delete
  using (auth.uid() = responder_id);

drop policy if exists "specialist_answers_update_admin" on public.specialist_answers;
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
create or replace function public.fan_out_specialist_request(p_request_id uuid)
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
create or replace function public.fan_out_specialist_answer(p_request_id uuid)
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

-- ============================================================================
-- Checklist — every row should read "ok"
-- ============================================================================

select
  item,
  case when present then 'ok' else 'MISSING' end as status
from (
  values
    ('bucket: case-images',
     exists (select 1 from storage.buckets where id = 'case-images')),
    ('table: conversations',
     to_regclass('public.conversations') is not null),
    ('table: messages',
     to_regclass('public.messages') is not null),
    ('column: cases.case_type',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cases'
               and column_name = 'case_type')),
    ('column: cases.near_miss',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cases'
               and column_name = 'near_miss')),
    ('column: cases.reveal_mode',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cases'
               and column_name = 'reveal_mode')),
    ('table: case_questions',
     to_regclass('public.case_questions') is not null),
    ('table: case_options',
     to_regclass('public.case_options') is not null),
    ('table: case_attempts',
     to_regclass('public.case_attempts') is not null),
    ('table: case_updates',
     to_regclass('public.case_updates') is not null),
    ('table: case_followers',
     to_regclass('public.case_followers') is not null),
    ('table: notifications',
     to_regclass('public.notifications') is not null),
    ('function: submit_case_answer',
     to_regprocedure('public.submit_case_answer(uuid,uuid)') is not null),
    ('function: case_answer_distribution',
     to_regprocedure('public.case_answer_distribution(uuid)') is not null),
    ('function: fan_out_case_update',
     to_regprocedure('public.fan_out_case_update(uuid,text,text)') is not null),
    -- The answer must not be readable by the browser's database roles.
    ('is_correct hidden from clients',
     not exists (
       select 1 from information_schema.column_privileges
       where table_schema = 'public' and table_name = 'case_options'
         and column_name = 'is_correct'
         and grantee in ('anon', 'authenticated')
         and privilege_type = 'SELECT'
     )),
    ('table: reports',
     to_regclass('public.reports') is not null),
    ('table: moderation_events',
     to_regclass('public.moderation_events') is not null),
    ('function: is_admin',
     to_regprocedure('public.is_admin()') is not null),
    ('column: profiles.suspended_at',
     exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'profiles'
         and column_name = 'suspended_at'
     )),
    ('column: cases.moderation_status',
     exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'cases'
         and column_name = 'moderation_status'
     )),
    ('reactions accept clinical values',
     exists (
       select 1 from pg_constraint
       where conname = 'reactions_type_check'
         and conrelid = 'public.reactions'::regclass
         and pg_get_constraintdef(oid) like '%changed_thinking%'
     )),
    -- Not just "the constraint changed": any surviving like would now be a row
    -- the app cannot count, so this checks the data moved too.
    ('no bare likes left behind',
     not exists (select 1 from public.reactions where type = 'like')),
    ('column: comments.label',
     exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'comments'
               and column_name = 'label')),
    ('table: specialist_requests',
     to_regclass('public.specialist_requests') is not null),
    ('table: specialist_answers',
     to_regclass('public.specialist_answers') is not null),
    ('function: is_specialist_in',
     to_regprocedure('public.is_specialist_in(text)') is not null),
    ('function: fan_out_specialist_request',
     to_regprocedure('public.fan_out_specialist_request(uuid)') is not null),
    ('function: fan_out_specialist_answer',
     to_regprocedure('public.fan_out_specialist_answer(uuid)') is not null)
) as checks(item, present);
