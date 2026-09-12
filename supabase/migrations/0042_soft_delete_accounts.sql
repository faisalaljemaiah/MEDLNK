-- Soft account deletion: a 30-day restore window before the same complete,
-- irreversible cascade deleteAccountAction/removeUserAction already perform
-- actually runs. Deleting now just marks the row; a daily Vercel Cron job
-- (src/app/api/cron/purge-deleted-accounts/route.ts) hard-deletes anything
-- past 30 days the same way those two actions always have.
--
-- Every write in this schema already routes through is_verified() (posting,
-- messaging, specialist answers, community creation, ...) or is_active()
-- (comments/reactions/follows, 0038) — adding `deleted_at is null` to both
-- means a soft-deleted-but-not-yet-purged account can't do anything while
-- it's sitting in the grace period, the same way a suspended one already
-- can't, without touching a single policy directly.

alter table public.profiles add column if not exists deleted_at timestamptz;

create or replace function public.is_verified()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select verified and suspended_at is null and deleted_at is null
     from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select suspended_at is null and deleted_at is null and handle is not null
     from public.profiles where id = auth.uid()),
    false
  );
$$;
