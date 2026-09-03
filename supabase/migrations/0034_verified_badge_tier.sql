-- Verified checkmark tiers: the plain blue check most verified members get,
-- plus three prestige colors an admin can hand out — Diamond and Gold are
-- auto-assigned once, by verification order (the first 10 verified members
-- ever get Diamond, the next 90 get Gold); Platinum and Green have no
-- automatic rule yet and stay admin-assigned via src/app/actions/admin.ts's
-- setBadgeTierAction until one is decided.
--
-- verified_at is new alongside badge_tier because "verification order" isn't
-- otherwise recoverable — verified is a plain boolean with no timestamp.
-- Existing verified rows are backfilled from created_at as the closest
-- available proxy (documented below); every verification from here on sets
-- verified_at for real, at the moment an admin approves it.

alter table public.profiles
  add column verified_at timestamptz,
  add column badge_tier text
    check (badge_tier is null or badge_tier in ('diamond', 'gold', 'platinum', 'green'));

-- One-time backfill for members verified before this migration existed —
-- created_at is a proxy for verification order here, not the real thing,
-- since no earlier column recorded when verification actually happened.
update public.profiles
  set verified_at = created_at
  where verified = true and verified_at is null;

-- One-time rank assignment over whoever is verified as of this migration.
-- Every verification from here on gets its tier computed the same way, at
-- approval time, in approveUserAction — this just seeds the initial ranking
-- so it isn't only future approvals that carry a tier.
with ranked as (
  select id, row_number() over (order by verified_at asc, id asc) as rn
  from public.profiles
  where verified = true and verified_at is not null
)
update public.profiles p
  set badge_tier = case when r.rn <= 10 then 'diamond' else 'gold' end
  from ranked r
  where p.id = r.id and r.rn <= 100
    -- Guards against clobbering a tier an admin already hand-set if this
    -- statement is ever re-run (it is, verbatim, from APPLY_TO_HOSTED.sql,
    -- which is re-pasted rather than run exactly once like this file) —
    -- only ever fills in a still-null badge_tier, never overwrites one.
    and p.badge_tier is null;

-- Extends the privilege guard to the two new columns: exactly the same
-- self-escalation risk (a member PATCHing their own row over PostgREST) as
-- is_admin/verified/suspended_at already guard against — a plain member
-- granting themselves a Diamond check is no different in kind.
--
-- Rebuilt from 0028's version of this function, not 0018's original — 0028
-- carved out one exception here (rejected -> pending, for resubmission).
-- Re-creating from the pre-0028 body would silently regress that carve-out
-- the moment this migration runs, since `create or replace` fully replaces
-- the function regardless of which earlier migration last touched it.
--
-- guard_profile_privilege_fields (0003/0028's other guard trigger) is left
-- untouched: it never covered suspended_at/suspended_reason either — 0018
-- only added those to this trigger — so verified_at/badge_tier follow the
-- same precedent and only need protecting here.
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
    if new.verified_at is distinct from old.verified_at
       or new.badge_tier is distinct from old.badge_tier then
      raise exception 'Only an admin can change verification badge tier';
    end if;
  end if;
  return new;
end;
$$;
