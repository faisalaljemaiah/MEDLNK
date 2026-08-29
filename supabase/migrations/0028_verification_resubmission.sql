-- Lets a rejected member get back into the admin's verification queue by
-- resubmitting (a corrected license number and/or a new document) — without
-- this, guard_profile_privilege_columns (0018) blocks ANY self-driven change
-- to verification_status, so a rejected member would be permanently stuck:
-- VerificationQueue only lists 'pending' rows, and only an admin can move a
-- row into that status.
--
-- This widens the guard by exactly one transition: rejected -> pending,
-- and only when `verified` doesn't change alongside it (it can't — a
-- resubmission is not a self-approval). Every other self-driven transition
-- stays blocked exactly as 0018 left it: pending/rejected -> approved,
-- approved -> anything, and verified flipping on its own all still raise.
--
-- Two triggers actually guard these columns, not one: 0018's
-- profiles_guard_privilege_columns (raises loudly) and an older one from
-- 0003, profiles_guard_privilege_fields (silently reverts instead of
-- raising — it predates 0018's stricter version but was never removed,
-- since it still independently covers the same three columns as a second
-- layer). Postgres fires BEFORE ROW triggers in name order, so "columns"
-- runs before "fields" — widening only 0018's function would let the first
-- check pass and then have the second trigger silently revert
-- verification_status right back to 'rejected' with no error. Both
-- functions need the same exception, or the resubmission never sticks.

create or replace function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Only an admin can change is_admin';
    end if;
    if new.verified is distinct from old.verified then
      raise exception 'Only an admin can change verification status';
    end if;
    if new.verification_status is distinct from old.verification_status then
      if not (old.verification_status = 'rejected' and new.verification_status = 'pending') then
        raise exception 'Only an admin can change verification status';
      end if;
    end if;
    if new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason then
      raise exception 'Only an admin can change suspension status';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_profile_privilege_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and not exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  then
    if new.verified is distinct from old.verified then
      new.verified := old.verified;
    end if;
    if new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin;
    end if;
    if new.verification_status is distinct from old.verification_status
       and not (old.verification_status = 'rejected' and new.verification_status = 'pending') then
      new.verification_status := old.verification_status;
    end if;
  end if;
  return new;
end;
$$;
