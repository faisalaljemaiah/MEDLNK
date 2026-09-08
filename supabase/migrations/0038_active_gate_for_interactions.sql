-- Launch decision: a member shouldn't have to wait on license review just
-- to use the network side of the app. Once license verification is back on
-- (LICENSE_VERIFICATION_ENABLED, src/lib/verification.ts) most new members
-- sit in verification_status 'pending' for a while, and during that wait
-- they should still be able to follow, react (like/save), and comment —
-- just not publish a case themselves. is_verified() gates both today, so
-- this splits it: is_active() (finished onboarding, not suspended) for the
-- three network actions; is_verified() keeps gating everything that
-- publishes something under the member's own name (cases, comments'
-- sibling content types, specialist answers, community creation, etc.).

create function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select suspended_at is null and handle is not null
     from public.profiles where id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_active() to anon, authenticated;

-- reactions (like, save — 0010) ----------------------------------------------
drop policy if exists "reactions_insert_verified_own" on public.reactions;
create policy "reactions_insert_active_own"
  on public.reactions for insert
  with check (auth.uid() = user_id and public.is_active());

-- comments ---------------------------------------------------------------------
drop policy if exists "comments_insert_verified_own" on public.comments;
create policy "comments_insert_active_own"
  on public.comments for insert
  with check (auth.uid() = user_id and public.is_active());

-- follows (superseding 0029's version, which added the blocked-pair check) ----
drop policy if exists "follows_insert_verified_own" on public.follows;
create policy "follows_insert_active_own"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and public.is_active()
    and not public.is_blocked_pair(follower_id, followee_id)
  );
