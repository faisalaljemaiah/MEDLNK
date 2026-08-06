-- Row Level Security
--
-- Summary:
--   * Guests (anon) and everyone else can READ profiles and cases (+ their
--     related comments/reactions/follows) — the feed must work signed out.
--   * Only verified profiles (profiles.verified = true) can INSERT cases,
--     comments, reactions, or follows.
--   * Everyone can only UPDATE/DELETE their own rows.
--   * ai_recaps has no authenticated/anon write policy at all — only the
--     service-role key (used from the Edge Function) can write it, since RLS
--     is bypassed entirely for service-role connections.

create function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select verified from public.profiles where id = auth.uid()), false);
$$;

-- profiles ---------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No insert policy: rows are created by the handle_new_user trigger
-- (security definer, bypasses RLS). No delete policy: accounts are removed
-- via Supabase Auth admin, which cascades from auth.users.

-- cases --------------------------------------------------------------------
alter table public.cases enable row level security;

create policy "cases_select_all"
  on public.cases for select
  using (true);

create policy "cases_insert_verified_own"
  on public.cases for insert
  with check (auth.uid() = author_id and public.is_verified());

create policy "cases_update_own"
  on public.cases for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "cases_delete_own"
  on public.cases for delete
  using (auth.uid() = author_id);

-- reactions ------------------------------------------------------------------
alter table public.reactions enable row level security;

create policy "reactions_select_all"
  on public.reactions for select
  using (true);

create policy "reactions_insert_verified_own"
  on public.reactions for insert
  with check (auth.uid() = user_id and public.is_verified());

create policy "reactions_delete_own"
  on public.reactions for delete
  using (auth.uid() = user_id);

-- comments -------------------------------------------------------------------
alter table public.comments enable row level security;

create policy "comments_select_all"
  on public.comments for select
  using (true);

create policy "comments_insert_verified_own"
  on public.comments for insert
  with check (auth.uid() = user_id and public.is_verified());

create policy "comments_update_own"
  on public.comments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "comments_delete_own"
  on public.comments for delete
  using (auth.uid() = user_id);

-- follows ----------------------------------------------------------------
alter table public.follows enable row level security;

create policy "follows_select_all"
  on public.follows for select
  using (true);

create policy "follows_insert_verified_own"
  on public.follows for insert
  with check (auth.uid() = follower_id and public.is_verified());

create policy "follows_delete_own"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ai_recaps ----------------------------------------------------------------
alter table public.ai_recaps enable row level security;

create policy "ai_recaps_select_all"
  on public.ai_recaps for select
  using (true);

-- Deliberately no insert/update/delete policy: only the service-role key
-- (Edge Function) can write, since it bypasses RLS entirely.
