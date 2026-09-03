-- Rate-limits how often a rejected member can resubmit for verification.
-- 0028 opened up the rejected -> pending self-transition so a rejected
-- member isn't stuck forever (updateProfileAction sets it when they change
-- their license number or upload a new document while rejected), but left
-- it uncapped — someone could hammer that transition indefinitely. This
-- caps it at 3 resubmissions per rolling 30 days, enforced with a trigger
-- rather than app code, the same way every other invariant in this schema
-- is — so it holds even if a future code path writes verification_status
-- directly instead of going through updateProfileAction.

create table public.verification_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.verification_attempts enable row level security;

-- Read-only from the app's side — every row is written by the trigger
-- below (security definer, so it isn't subject to this policy itself),
-- never by a direct insert from the app. So there's only a select policy:
-- a member can see their own attempt history, an admin can see anyone's.
create policy "verification_attempts_select_own_or_admin"
  on public.verification_attempts for select
  using (auth.uid() = profile_id or public.is_admin());

create function public.enforce_verification_resubmission_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_attempts int;
begin
  select count(*) into recent_attempts
  from public.verification_attempts
  where profile_id = new.id
    and created_at > now() - interval '30 days';

  if recent_attempts >= 3 then
    raise exception
      'You''ve used all 3 verification attempts allowed in a 30-day period. Please try again later.';
  end if;

  insert into public.verification_attempts (profile_id) values (new.id);
  return new;
end;
$$;

-- Fires on exactly the one self-driven transition 0028 opened up (rejected
-- -> pending) — nothing else changes verification_status this way, so this
-- is the complete set of resubmissions to count. Runs regardless of which
-- role performs the update; it's a data invariant, not a permission check
-- (0018/0003's guard triggers already own permission).
create trigger profiles_enforce_verification_resubmission_limit
  before update on public.profiles
  for each row
  when (old.verification_status = 'rejected' and new.verification_status = 'pending')
  execute function public.enforce_verification_resubmission_limit();
