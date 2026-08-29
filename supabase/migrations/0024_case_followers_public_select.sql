-- Case-follower counts and "people you follow also follow this case" both
-- need every viewer to read case_followers rows, not just the follower
-- themselves — the same public-read shape the person-to-person `follows`
-- table already has (0004_rls.sql: "follows_select_all"). Insert/delete
-- stay owner-only; only who-can-see-who's-following changes.

drop policy if exists "case_followers_select_own" on public.case_followers;
drop policy if exists "case_followers_select_all" on public.case_followers;

create policy "case_followers_select_all"
  on public.case_followers for select
  using (true);
