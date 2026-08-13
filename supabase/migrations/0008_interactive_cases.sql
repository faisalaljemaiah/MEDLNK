-- Interactive cases: post types, "What Would You Do?", Case Evolution,
-- Follow Case, and the notifications they feed.
--
-- Everything here is additive. New columns are defaulted or nullable so every
-- existing case row stays valid and the current UI keeps rendering untouched.

-- cases: post type + format-specific payloads --------------------------------

alter table public.cases
  add column case_type text not null default 'clinical_case'
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
alter table public.cases add column near_miss jsonb;

-- Blind Cases hide the closing sections until the reader chooses to reveal.
alter table public.cases
  add column reveal_mode text not null default 'none'
    check (reveal_mode in ('none', 'staged'));

create index cases_case_type_idx on public.cases (case_type);

-- Interactive question --------------------------------------------------------
-- v1 is one question per case (see the unique constraint). Lifting that to a
-- multi-step stem later means dropping the constraint and adding a position
-- column — no data migration.

create table public.case_questions (
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

create table public.case_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.case_questions (id) on delete cascade,
  body text not null,
  is_correct boolean not null default false,
  position int not null,
  unique (question_id, position)
);

create index case_options_question_idx on public.case_options (question_id, position);

create table public.case_attempts (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.case_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_id uuid not null references public.case_options (id) on delete cascade,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);

create index case_attempts_question_idx on public.case_attempts (question_id);
create index case_attempts_user_idx on public.case_attempts (user_id, created_at desc);

-- Case Evolution ---------------------------------------------------------------

create table public.case_updates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  stage text not null,
  body text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index case_updates_case_idx on public.case_updates (case_id, position, created_at);

-- Follow Case ------------------------------------------------------------------

create table public.case_followers (
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (case_id, user_id)
);

create index case_followers_user_idx on public.case_followers (user_id, created_at desc);

-- Notifications ----------------------------------------------------------------
-- Generic on purpose: `type` widens without a schema change as §24 fills in.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  body text not null,
  case_id uuid references public.cases (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id)
  where read_at is null;

-- RLS ---------------------------------------------------------------------------
-- Same shape as 0004: readable by everyone (the feed works signed out), writable
-- only by a verified author of the parent case.

alter table public.case_questions enable row level security;

create policy "case_questions_select_all"
  on public.case_questions for select
  using (true);

create policy "case_questions_write_own_case"
  on public.case_questions for insert
  with check (
    public.is_verified()
    and exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

create policy "case_questions_update_own_case"
  on public.case_questions for update
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

alter table public.case_options enable row level security;

create policy "case_options_select_all"
  on public.case_options for select
  using (true);

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
create policy "case_attempts_select_own"
  on public.case_attempts for select
  using (auth.uid() = user_id);

alter table public.case_updates enable row level security;

create policy "case_updates_select_all"
  on public.case_updates for select
  using (true);

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

create policy "case_updates_delete_own"
  on public.case_updates for delete
  using (auth.uid() = author_id);

alter table public.case_followers enable row level security;

create policy "case_followers_select_own"
  on public.case_followers for select
  using (auth.uid() = user_id);

create policy "case_followers_insert_own"
  on public.case_followers for insert
  with check (auth.uid() = user_id);

create policy "case_followers_delete_own"
  on public.case_followers for delete
  using (auth.uid() = user_id);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);

-- Marking read is the only field a recipient may change; the using/with check
-- pair keeps a row from being reassigned to someone else.
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No insert policy: notifications are written by fan_out_case_update() below,
-- which is security definer. Clients must never mint their own.

-- Functions -----------------------------------------------------------------------

-- Records an answer and reports whether it was right. Security definer because
-- case_options.is_correct is not readable by the caller — this is the only path
-- by which correctness is revealed, and it only reveals it *after* the attempt
-- is stored.
create function public.submit_case_answer(p_question_id uuid, p_option_id uuid)
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
create function public.case_answer_distribution(p_question_id uuid)
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
create function public.fan_out_case_update(
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
