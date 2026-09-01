-- Communities: a real, joinable group directory. Everything under
-- "communities" on the home feed (trending-communities.tsx) up to this point
-- was a derived stand-in grouping cases by specialty, with no dedicated
-- table — this is the first real one, created by users rather than fabricated
-- from existing data. `scope` distinguishes a community open to any member
-- worldwide from one scoped to a single country (reusing the country codes
-- already used by the Global Case Exchange, src/lib/countries.ts) — the app's
-- own idea of "international" for the join popup.

create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  scope text not null check (scope in ('global', 'country')),
  country_code text,
  creator_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (scope = 'country' and country_code is not null)
    or (scope = 'global' and country_code is null)
  )
);

-- A single row per (community, member) — `status` distinguishes an actual
-- member from someone who only bookmarked the community for later, so the
-- Messages "Communities" tab can list both without two tables. Moving from
-- 'saved' to 'joined' (or back) is an update, not a delete+insert, so the
-- primary key never has to be re-created.
create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('joined', 'saved')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

alter table public.communities enable row level security;
alter table public.community_members enable row level security;

-- Mirrors is_verified() (0004_rls.sql) — a security-definer helper so a
-- write policy can gate on a count over another table without granting the
-- caller direct read access to that table for this purpose.
create function public.has_min_followers(min_count int)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    select count(*) from public.follows where followee_id = auth.uid()
  ) >= min_count;
$$;

-- communities --------------------------------------------------------------

-- Bubbles must work signed out, same as cases and profiles.
create policy "communities_select_all"
  on public.communities for select
  using (true);

-- The 100-follower threshold is a product choice, not a security boundary,
-- so it's a literal here rather than a config table — same call as every
-- other fixed threshold in this schema (e.g. the verification requirements).
create policy "communities_insert_eligible"
  on public.communities for insert
  with check (
    auth.uid() = creator_id
    and public.is_verified()
    and public.has_min_followers(100)
  );

create policy "communities_update_creator"
  on public.communities for update
  using (auth.uid() = creator_id);

create policy "communities_delete_creator"
  on public.communities for delete
  using (auth.uid() = creator_id);

-- community_members ---------------------------------------------------------

-- Public, same call as follows_select_all (0004_rls.sql): member counts have
-- to be visible to signed-out visitors browsing the bubble cluster, and this
-- app already treats "who is a member/follower of what" as public social
-- graph data rather than private per-row data.
create policy "community_members_select_all"
  on public.community_members for select
  using (true);

create policy "community_members_insert_own"
  on public.community_members for insert
  with check (auth.uid() = user_id and public.is_verified());

-- Covers the join<->save transition (updating `status` in place).
create policy "community_members_update_own"
  on public.community_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leaving a community and un-saving a bookmark are both "remove my row".
create policy "community_members_delete_own"
  on public.community_members for delete
  using (auth.uid() = user_id);
