-- Clinical Reasoning Trees (spec §8) and Global Case Exchange (spec §19).
--
-- Everything here is additive. country_code is nullable so every existing
-- case row stays valid, and case_reasoning_nodes is a wholly new, optional
-- table an author may or may not use — the case page already renders fine
-- with none attached.

-- Global Case Exchange ---------------------------------------------------------
--
-- Country only, never a hospital or unit: the spec is explicit that Global
-- Case Exchange must not expose exactly where a case happened, only roughly
-- where in the world. The two-letter code is validated for shape, not against
-- a table of real countries — that list lives in the app (src/lib/countries.ts)
-- so it can grow without a migration.

alter table public.cases add column country_code text
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

create index cases_country_idx on public.cases (country_code)
  where country_code is not null;

-- Clinical Reasoning Trees -------------------------------------------------------
--
-- A branching record of how the author reasoned through the case: findings,
-- differentials considered, actions taken, the conclusion — each optionally
-- the parent of the next branch. v1 is author-authored only (no reader
-- branches), added after the case is published, same shape as Case Evolution's
-- case_updates: an append-only supplement, not part of the original post.

create table public.case_reasoning_nodes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  parent_id uuid references public.case_reasoning_nodes (id) on delete cascade,
  node_type text not null default 'differential'
    check (node_type in ('finding', 'differential', 'action', 'conclusion')),
  label text not null,
  body text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index case_reasoning_nodes_case_idx
  on public.case_reasoning_nodes (case_id, parent_id, position);

alter table public.case_reasoning_nodes enable row level security;

-- Same shape as case_questions/case_updates: readable by everyone (the feed
-- and case page work signed out), writable only by a verified author of the
-- parent case.

create policy "case_reasoning_nodes_select_all"
  on public.case_reasoning_nodes for select
  using (true);

create policy "case_reasoning_nodes_insert_own_case"
  on public.case_reasoning_nodes for insert
  with check (
    public.is_verified()
    and exists (
      select 1 from public.cases c
      where c.id = case_reasoning_nodes.case_id and c.author_id = auth.uid()
    )
    -- A child's parent, when given, must belong to the same case — otherwise
    -- an author could graft a branch onto someone else's tree by guessing an
    -- id, and the tree rendered for one case would include another's nodes.
    --
    -- Both sides of the inner exists are qualified with the outer table name
    -- on purpose: `p` is itself an aliased case_reasoning_nodes, so it carries
    -- its own parent_id and case_id columns. Left unqualified, Postgres
    -- resolves parent_id/case_id to p's columns (the innermost scope) rather
    -- than the row being inserted, which silently turns this into "does a
    -- node exist that is its own parent" — always false — and rejects every
    -- non-root insert. Caught by 0017.4 in the local test suite.
    and (
      case_reasoning_nodes.parent_id is null
      or exists (
        select 1 from public.case_reasoning_nodes p
        where p.id = case_reasoning_nodes.parent_id
          and p.case_id = case_reasoning_nodes.case_id
      )
    )
  );

create policy "case_reasoning_nodes_update_own_case"
  on public.case_reasoning_nodes for update
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

create policy "case_reasoning_nodes_delete_own_case"
  on public.case_reasoning_nodes for delete
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );
