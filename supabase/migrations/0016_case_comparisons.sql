-- Case vs Case (spec §15).
--
-- The `case_vs_case` post type has existed since 0008 and produced an ordinary
-- case with a misleading badge: nothing recorded which two cases were being
-- compared, so the format promised a comparison and delivered prose.
--
-- The comparison points at two real cases rather than restating them inline.
-- That is the whole value — the reader can open either side and read the full
-- write-up, the original authors keep the credit, and the pair stays correct if
-- either case is edited. Restating them would fork the content on day one.

create table public.case_comparisons (
  id uuid primary key default gen_random_uuid(),

  -- The case_vs_case post itself. One comparison per post: a post that
  -- compared three different pairs would have no coherent title.
  case_id uuid not null unique references public.cases (id) on delete cascade,

  left_case_id uuid not null references public.cases (id) on delete cascade,
  right_case_id uuid not null references public.cases (id) on delete cascade,

  -- The point of the post: what actually changes the management between them.
  discriminator text not null,

  created_at timestamptz not null default now(),

  -- A case compared with itself is not a comparison.
  constraint case_comparisons_distinct_sides check (left_case_id <> right_case_id),
  -- ...and neither is one that compares the post to something.
  constraint case_comparisons_not_self
    check (case_id <> left_case_id and case_id <> right_case_id)
);

create index case_comparisons_left_idx on public.case_comparisons (left_case_id);
create index case_comparisons_right_idx on public.case_comparisons (right_case_id);

alter table public.case_comparisons enable row level security;

-- Readable by everyone, like the cases it points at — the feed works signed
-- out. Note this exposes only *that* two cases were compared; whether either
-- side is actually visible to the reader is still decided by cases' own RLS, so
-- a removed case doesn't leak its content through here.
create policy "case_comparisons_select_all"
  on public.case_comparisons for select
  using (true);

create policy "case_comparisons_insert_own_case"
  on public.case_comparisons for insert
  with check (
    public.is_verified()
    and exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );

create policy "case_comparisons_update_own_case"
  on public.case_comparisons for update
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

create policy "case_comparisons_delete_own_case"
  on public.case_comparisons for delete
  using (
    exists (
      select 1 from public.cases c
      where c.id = case_id and c.author_id = auth.uid()
    )
  );
