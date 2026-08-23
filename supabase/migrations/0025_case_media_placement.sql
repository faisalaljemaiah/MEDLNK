-- Lets an author attach a video (or photo) to a full-write-up case and
-- choose where it renders — inline under a specific section (Presentation /
-- What was tricky / What we did / The lesson) instead of always sitting at
-- the top of the case, above the write-up. Null/'top' preserves the
-- existing behaviour for every case posted before this migration.

alter table public.cases add column if not exists media_placement text;

alter table public.cases drop constraint if exists cases_media_placement_check;
alter table public.cases add constraint cases_media_placement_check
  check (media_placement is null or media_placement in (
    'top',
    'presentation',
    'tricky',
    'actions',
    'lesson'
  ));
