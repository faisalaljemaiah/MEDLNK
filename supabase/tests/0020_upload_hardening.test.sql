-- Behaviour test for 0020_upload_hardening.sql.
--
-- Configuration-only migration (no RLS to exercise), so this just confirms
-- both buckets actually carry the limit and allowlist rather than assuming
-- the UPDATE matched.
\set ON_ERROR_STOP off

reset role;

\echo ''
\echo '### 1. case-images has a size limit and an image-only allowlist'
select test.check(
  '0020.1 case-images file_size_limit set',
  (select file_size_limit::text from storage.buckets where id = 'case-images'),
  '8388608');
select test.check(
  '0020.2 case-images rejects svg',
  (select ('image/svg+xml' = any(allowed_mime_types))::text
     from storage.buckets where id = 'case-images'),
  'false');

\echo ''
\echo '### 2. avatars has the same limit and allowlist'
select test.check(
  '0020.3 avatars file_size_limit set',
  (select file_size_limit::text from storage.buckets where id = 'avatars'),
  '8388608');
select test.check(
  '0020.4 avatars rejects svg',
  (select ('image/svg+xml' = any(allowed_mime_types))::text
     from storage.buckets where id = 'avatars'),
  'false');
