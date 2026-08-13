-- Structured comment labels (spec §25).
--
-- A clinical discussion thread is not a comment section. The useful questions
-- under a case are "would you have done the same?", "why not?", "what am I
-- missing?" — and a reader scanning forty replies needs to see which is which
-- before reading a word. The label is the answer to "what kind of reply is
-- this", chosen by the commenter and rendered as a badge.
--
-- Nullable, and null is explicitly allowed by the check: every comment written
-- before this migration stays valid, and an unlabelled reply stays a perfectly
-- good reply.

alter table public.comments
  add column label text
    check (label is null or label in (
      'agree',
      'differ',
      'question',
      'teaching',
      'evidence'
    ));

-- comments_update_own (0004) already lets an author edit their own row, which
-- covers relabelling. No new policy is needed.
