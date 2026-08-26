-- Verification documents: clinicians upload proof of license or proof of
-- study during onboarding, and an admin reviews the actual document (not
-- just the typed license number) before approving. Unlike avatars/
-- case-images/case-videos, this bucket is NOT public — a license or student
-- ID is identifying personal information, so only its owner and an admin
-- doing verification review should ever be able to read it. The app reads
-- it via a short-lived signed URL generated server-side (supabase.storage
-- .createSignedUrl), never a public URL.

alter table public.profiles add column if not exists license_document_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-docs', 'verification-docs', false,
  8388608, -- 8 MiB, same ceiling as avatars/case-images
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

-- Owner can read their own document (so onboarding can show "document on
-- file"); an admin can read anyone's, to review it in the verification
-- queue. No public read — the one bucket in this app that isn't.
drop policy if exists "verification_docs_select_own_or_admin" on storage.objects;
create policy "verification_docs_select_own_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Any signed-up member can upload their own document — deliberately not
-- gated on public.is_verified() like case-images/case-videos, since
-- uploading this document is what verification depends on, not something
-- verification unlocks.
drop policy if exists "verification_docs_insert_own_folder" on storage.objects;
create policy "verification_docs_insert_own_folder"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lets a rejected member replace their document and re-submit for review.
drop policy if exists "verification_docs_update_own_folder" on storage.objects;
create policy "verification_docs_update_own_folder"
  on storage.objects for update
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "verification_docs_delete_own_folder" on storage.objects;
create policy "verification_docs_delete_own_folder"
  on storage.objects for delete
  using (
    bucket_id = 'verification-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
