-- Behaviour tests for 0027_verification_documents.sql.
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'

reset role;
insert into auth.users (id, email) values (:'member','member@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='docsmember', verified=false, suspended_at=null,
  license_document_path = null
  where id=:'member';

\echo ''
\echo '### 1. bucket is private with a size limit and an image/pdf allowlist'
select test.check(
  '0027.1 verification-docs is not public',
  (select public::text from storage.buckets where id = 'verification-docs'),
  'false');
select test.check(
  '0027.2 verification-docs file_size_limit set',
  (select file_size_limit::text from storage.buckets where id = 'verification-docs'),
  '8388608');
select test.check(
  '0027.3 verification-docs allows pdf',
  (select ('application/pdf' = any(allowed_mime_types))::text
     from storage.buckets where id = 'verification-docs'),
  'true');
select test.check(
  '0027.4 verification-docs rejects svg',
  (select ('image/svg+xml' = any(allowed_mime_types))::text
     from storage.buckets where id = 'verification-docs'),
  'false');

\echo ''
\echo '### 2. an unverified member can still set their own document path'
\echo '(uploading it is what verification depends on, not something it unlocks)'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set license_document_path = '11111111-1111-1111-1111-111111111111/doc.pdf'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0027.5 member can set their own license_document_path',
  (select license_document_path from public.profiles where id=:'member'),
  '11111111-1111-1111-1111-111111111111/doc.pdf');

reset role;
update public.profiles set license_document_path = null where id=:'member';
