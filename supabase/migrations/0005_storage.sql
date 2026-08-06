-- Storage bucket for case images (v1: images only, public read).
-- Convention: object path is "<author_id>/<uuid>.<ext>" so ownership can be
-- checked from the path itself without an extra lookup table.

insert into storage.buckets (id, name, public)
values ('case-images', 'case-images', true)
on conflict (id) do nothing;

create policy "case_images_read_all"
  on storage.objects for select
  using (bucket_id = 'case-images');

create policy "case_images_insert_verified_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'case-images'
    and public.is_verified()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "case_images_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'case-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
