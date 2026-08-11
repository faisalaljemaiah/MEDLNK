-- Stop authors from reversing their own takedowns.
--
-- 0009 gave cases and comments a moderation_status and made removed content
-- invisible to everyone but its author and admins. What it did not do is stop
-- the author writing that column: cases_update_own / comments_update_own (0004)
-- grant UPDATE on the *row*, and RLS is row-level, so
--
--   update public.cases set moderation_status = 'visible' where id = <mine>
--
-- succeeded. A moderator's decision lasted until the author noticed. 0009's own
-- test asserts this doesn't work ("### 12. a member cannot un-remove their own
-- case"); the suite prints results rather than failing on them, so the wrong
-- answer went by unread.
--
-- This is the same lesson 0008 applied to case_options.is_correct: row-level
-- policies cannot protect a single column. There, column privileges were the
-- answer. They are not the answer here, because admins connect as the same
-- `authenticated` role as everyone else — revoking the column would lock
-- moderators out of moderating. A trigger can see both the old and the new row,
-- which is exactly what "this column may not change unless you are an admin"
-- needs and what a WITH CHECK clause cannot express.

-- Security INVOKER, deliberately. It needs nothing privileged of its own — the
-- admin check is public.is_admin(), which is security definer and does its own
-- lookup — and under SECURITY DEFINER `current_user` reads as the function's
-- owner rather than the caller, so the role test below would never match and
-- the guard would silently never fire. Postgres does not require EXECUTE on a
-- trigger function, so invoker costs nothing here.
create function public.guard_moderation_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Scoped to the roles a browser can reach the database as. `service_role` and
  -- the owner are already fully trusted — RLS itself doesn't constrain them —
  -- and catching them here would block backfills, Edge Functions and admin
  -- scripts from ever setting the column. Anon can't get this far anyway:
  -- cases_update_own requires auth.uid() = author_id, which no unauthenticated
  -- request satisfies.
  if new.moderation_status is distinct from old.moderation_status
     and current_user in ('anon', 'authenticated')
     and not public.is_admin() then
    raise exception 'Only a moderator can change moderation status';
  end if;
  return new;
end;
$$;

-- Raises rather than silently restoring the old value. An attempt to reverse a
-- takedown is worth surfacing, and a quiet coercion would leave the app
-- reporting success on a write that did nothing.
--
-- Only fires when the column actually changes, so an ordinary edit that happens
-- to send the whole row back is unaffected.

create trigger cases_guard_moderation_status
  before update on public.cases
  for each row execute function public.guard_moderation_status();

create trigger comments_guard_moderation_status
  before update on public.comments
  for each row execute function public.guard_moderation_status();

-- 0012's answers carry the same column and the same update-own policy, so they
-- carry the same hole.
create trigger specialist_answers_guard_moderation_status
  before update on public.specialist_answers
  for each row execute function public.guard_moderation_status();
