-- Behaviour tests for 0022_photo_quote_video_posts.sql.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set kase1  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'
\set kase2  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'
\set kase3  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true
  where id=:'author';

\echo ''
\echo '### 1. the three new post formats are accepted'
insert into public.cases (id, author_id, title, short_caption, case_type)
values
  (:'kase1', :'author', 'On staying humble', 'quote', 'quote_post'),
  (:'kase2', :'author', 'Photo from shift', 'photo', 'photo_post'),
  (:'kase3', :'author', 'Short clip', 'video', 'video_post');
select test.check(
  '0022.1 all three formats saved',
  (select count(*)::text from public.cases where id in (:'kase1', :'kase2', :'kase3')),
  '3');

\echo ''
\echo '### 2. an existing format is still accepted (constraint was widened, not replaced)'
insert into public.cases (author_id, title, short_caption, case_type)
values (:'author', 'Standard write-up', 'caption', 'clinical_case');
select test.check(
  '0022.2 clinical_case still accepted',
  (select count(*)::text from public.cases where case_type = 'clinical_case'),
  '1');

\echo ''
\echo '### 3. an unknown format is still rejected'
select test.expect_error(
  '0022.3 check constraint rejects a made-up format',
  $$insert into public.cases (author_id, title, short_caption, case_type)
    values ('11111111-1111-1111-1111-111111111111', 'x', 'x', 'not_a_real_format')$$);

\echo ''
\echo '### 4. case-videos has its own size limit and video-only allowlist'
select test.check(
  '0022.4 case-videos file_size_limit set',
  (select file_size_limit::text from storage.buckets where id = 'case-videos'),
  '52428800');
select test.check(
  '0022.5 case-videos allows mp4',
  (select ('video/mp4' = any(allowed_mime_types))::text
     from storage.buckets where id = 'case-videos'),
  'true');
select test.check(
  '0022.6 case-videos rejects svg',
  (select coalesce(('image/svg+xml' = any(allowed_mime_types))::text, 'false')
     from storage.buckets where id = 'case-videos'),
  'false');

reset role;
