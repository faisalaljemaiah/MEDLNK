-- Three new lightweight post formats alongside the structured clinical case:
-- a photo, a quote/saying, and a short video. All still rows in `cases` —
-- shortForm on the client side (src/lib/case-types.ts), no new table.
--
-- video_post is the one that needs new infrastructure: it's the first format
-- whose media is a video rather than an image, so it gets its own bucket
-- (case-images stays image-only, matching its allowed_mime_types from 0020)
-- with its own size ceiling. photo_post and quote_post reuse the existing
-- case-images bucket and media_url column — nothing new needed for those.

alter table public.cases drop constraint cases_case_type_check;
alter table public.cases add constraint cases_case_type_check check (case_type in (
  'clinical_case',
  'what_would_you_do',
  'blind_case',
  'case_evolution',
  'near_miss',
  'safety_alert',
  'saw_this_today',
  'clinical_pearl',
  'things_i_wish_i_knew',
  'case_vs_case',
  'research_finding',
  'photo_post',
  'quote_post',
  'video_post'
));

-- Storage bucket for video posts (v1: mp4/webm/mov, 50 MiB, public read).
-- Same ownership convention as case-images: "<author_id>/<uuid>.<ext>".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'case-videos', 'case-videos', true,
  52428800, -- 50 MiB
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do nothing;

create policy "case_videos_read_all"
  on storage.objects for select
  using (bucket_id = 'case-videos');

create policy "case_videos_insert_verified_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'case-videos'
    and public.is_verified()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "case_videos_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'case-videos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
