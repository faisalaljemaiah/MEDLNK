-- What a member picked on the "Pick your interests" sign-up step (and can
-- change later from Settings). Plain text slugs from src/lib/interests.ts:
-- topic slugs ("cardiology") and case-type values ("near_miss") share one
-- list, since nothing needs to tell them apart in SQL yet. Stored now so the
-- personalized home feed has data to rank on when it's built; nothing reads
-- it yet besides the picker itself.
--
-- No new RLS: profiles already lets a member update their own row, and the
-- privilege-guard triggers (0018/0028/0034) only lock the verification and
-- admin columns, not this one.
alter table public.profiles
  add column if not exists interests text[] not null default '{}';

alter table public.profiles
  drop constraint if exists profiles_interests_max;
alter table public.profiles
  add constraint profiles_interests_max check (cardinality(interests) <= 40);
