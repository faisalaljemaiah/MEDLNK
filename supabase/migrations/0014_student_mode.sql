-- Student Mode (spec §11, §26).
--
-- A preference, not a role. profiles.role is free text and already says
-- "Medical student" for some people, but a resident revising for exams and a
-- consultant reading outside their specialty both want the same thing — the
-- app leading with what to practise rather than what's new. Tying this to the
-- role string would hand it to one group and withhold it from the others.
--
-- Defaults false, so every existing profile keeps exactly the app it has.

alter table public.profiles
  add column student_mode boolean not null default false;

-- No new policy: profiles_update_own (0004) already lets a member change their
-- own row, and this is theirs to set.
