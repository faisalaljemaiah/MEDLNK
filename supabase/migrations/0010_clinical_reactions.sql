-- Clinical-value reactions (spec §9).
--
-- "Like" carries no clinical meaning: on a network where the unit of content is
-- a patient-safety event or a management decision, a heart tells the author
-- nothing about *why* the case mattered. These three do — and they are the
-- signal profile stats and reputation later read from, so they replace the bare
-- like rather than sitting alongside it.
--
--   interesting       💡 worth knowing
--   changed_thinking  🧠 I will practise differently
--   patient_safety    ⚠️ this is a safety issue others should see
--
-- repost and save are untouched: they are distribution and bookmarking, not a
-- judgement about the case.

-- Existing likes become "interesting" — the closest honest reading of a like,
-- and it keeps every historical row counted instead of orphaning it under a
-- value the constraint no longer permits.
--
-- Safe against the unique (case_id, user_id, type) constraint: 'interesting'
-- did not exist before this migration, so no row can collide with itself.
update public.reactions set type = 'interesting' where type = 'like';

alter table public.reactions drop constraint reactions_type_check;

alter table public.reactions add constraint reactions_type_check
  check (type in (
    'repost',
    'save',
    'interesting',
    'changed_thinking',
    'patient_safety'
  ));

-- Feed and case reads pull every reaction for a case and aggregate in JS, so
-- the existing reactions_case_id_idx still covers them. This one serves the
-- profile's "marked" tab, which asks the opposite question: what did *this*
-- user mark, across all cases.
create index if not exists reactions_user_type_idx
  on public.reactions (user_id, type);
