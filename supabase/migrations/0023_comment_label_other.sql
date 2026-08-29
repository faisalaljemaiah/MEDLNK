-- Add "Other" as a sixth reply label (0011 was deliberately five — a reader
-- scanning a thread needs to see what kind of reply it is at a glance, and a
-- reply that's genuinely none of the five shouldn't be forced into the
-- closest-fitting one just because there's no honest option). Requested
-- directly.

alter table public.comments drop constraint comments_label_check;
alter table public.comments add constraint comments_label_check
  check (label is null or label in (
    'agree',
    'differ',
    'question',
    'teaching',
    'evidence',
    'other'
  ));
