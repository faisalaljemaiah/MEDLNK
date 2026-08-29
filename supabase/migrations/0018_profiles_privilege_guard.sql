-- Security fix: profiles_update_own (0004) grants UPDATE on the *row* —
-- `using (auth.uid() = id) with check (auth.uid() = id)` — with no column
-- restriction. RLS is row-level, so it cannot by itself stop a signed-in
-- member from PATCHing their own profile with
--
--   { "is_admin": true }
--   { "verified": true, "verification_status": "approved" }
--   { "suspended_at": null }
--
-- via a plain authenticated REST call (the anon key is public by design; any
-- signed-in session can reach PostgREST directly, with or without going
-- through the app). Each of those is a real privilege escalation:
-- self-granting admin access, self-approving license verification without
-- review (the entire point of "verified clinicians only"), or a suspended
-- member clearing their own suspension and immediately regaining every write
-- path is_verified() gates.
--
-- This is exactly the class of bug 0013 fixed for cases/comments/
-- specialist_answers.moderation_status, and the same fix applies: a trigger,
-- because it sees both the old and new row, which is what "this column may
-- not change except by an admin" needs and a WITH CHECK clause cannot
-- express. No existing legitimate flow touches any of these five columns
-- except the signup trigger (INSERT, unaffected) and the admin-gated actions
-- in src/app/actions/admin.ts and src/app/actions/reports.ts (requireAdmin()
-- before every write) — so guarding them costs nothing real.

-- Security INVOKER, deliberately — same reasoning as guard_moderation_status:
-- public.is_admin() is itself security definer and does its own lookup, and
-- under SECURITY DEFINER `current_user` reads as the function owner rather
-- than the caller, which would make the role check below never match and the
-- guard never fire.
create function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Scoped to roles a browser can reach the database as. service_role and the
  -- table owner are already fully trusted — RLS doesn't constrain them, and
  -- catching them here would block the signup trigger's own bootstrap and any
  -- admin tooling that connects as service_role.
  if current_user in ('anon', 'authenticated') and not public.is_admin() then
    if new.is_admin is distinct from old.is_admin then
      raise exception 'Only an admin can change is_admin';
    end if;
    if new.verified is distinct from old.verified
       or new.verification_status is distinct from old.verification_status then
      raise exception 'Only an admin can change verification status';
    end if;
    if new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason then
      raise exception 'Only an admin can change suspension status';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privilege_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_columns();
