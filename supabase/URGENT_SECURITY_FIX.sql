-- ============================================================================
-- URGENT — apply this before anything else.
-- ============================================================================
--
-- profiles_update_own (0004, live on the hosted project) grants UPDATE on the
-- *row* — `using (auth.uid() = id) with check (auth.uid() = id)` — with no
-- column restriction. RLS is row-level, so as shipped, ANY signed-in member
-- can PATCH their own profile with:
--
--   { "is_admin": true }                                    -- self-promote to admin
--   { "verified": true, "verification_status": "approved" } -- self-approve verification
--   { "suspended_at": null }                                -- clear their own suspension
--
-- via a plain authenticated REST call to Supabase — the anon key is public by
-- design, so this needs no special access, just a signed-up account. This
-- undermines Asyashare's entire premise ("verified healthcare professionals
-- only") and gives full admin access to anyone who tries. Fixed by a trigger
-- (RLS's WITH CHECK can't see the old row, which "this may not change except
-- by an admin" needs). Full writeup in HANDOFF.md and
-- supabase/migrations/0018_profiles_privilege_guard.sql.
--
-- Two smaller, related fixes are bundled in here too, both already covered
-- by supabase/tests/ (0019, 0020 test files) and already in
-- supabase/migrations/ as 0019 and 0020:
--   - A specialist could reassign their own existing answer onto a request
--     outside their specialty (the "Specialist Answer" badge is supposed to
--     mean something), by updating request_id directly.
--   - Neither storage bucket had a size limit or a MIME-type allowlist, and
--     the app trusted the client-supplied Content-Type — an open door to
--     upload and publicly host arbitrary files (including HTML/script)
--     under the project's own Supabase domain.
--
-- HOW TO RUN
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file ->
--   Run. Every statement is guarded, so it's safe even if some of it already
--   applied. This is a subset of the full supabase/APPLY_TO_HOSTED.sql (which
--   also has 0018-0020 in it) — run this one FIRST, standalone, so the fix
--   lands in seconds rather than waiting on the larger paste.

-- 0018: profiles privilege guard --------------------------------------------

drop function if exists public.guard_profile_privilege_columns() cascade;

create function public.guard_profile_privilege_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
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

drop trigger if exists profiles_guard_privilege_columns on public.profiles;
create trigger profiles_guard_privilege_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_columns();

-- 0019: specialist answer reassignment guard ---------------------------------
-- No-ops cleanly if 0012 (Ask a Specialist) isn't applied to this project yet.

do $$
begin
  if to_regclass('public.specialist_answers') is not null then
    drop policy if exists "specialist_answers_update_own" on public.specialist_answers;
    create policy "specialist_answers_update_own"
      on public.specialist_answers for update
      using (auth.uid() = responder_id)
      with check (
        auth.uid() = responder_id
        and exists (
          select 1 from public.specialist_requests r
          where r.id = request_id
            and public.is_specialist_in(r.specialty)
        )
      );
  end if;
end $$;

-- 0020: upload hardening -----------------------------------------------------
-- No-ops cleanly if a bucket doesn't exist on this project yet (0005/0006).

update storage.buckets
set file_size_limit = 8388608, -- 8 MiB
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id in ('case-images', 'avatars');

-- ============================================================================
-- Checklist — every row should read "ok"
-- ============================================================================

select
  item,
  case when present then 'ok' else 'MISSING' end as status
from (
  values
    ('trigger: profiles_guard_privilege_columns',
     (select count(*) from pg_trigger
      where tgname = 'profiles_guard_privilege_columns' and not tgisinternal) = 1),
    ('storage: case-images size/type limit set',
     coalesce((select file_size_limit from storage.buckets where id = 'case-images') = 8388608, true)),
    ('storage: avatars size/type limit set',
     coalesce((select file_size_limit from storage.buckets where id = 'avatars') = 8388608, true)),
    ('policy: specialist_answers_update_own re-created',
     coalesce((select true from pg_policies
               where schemaname = 'public' and tablename = 'specialist_answers'
                 and policyname = 'specialist_answers_update_own'), true))
) as checks(item, present);
