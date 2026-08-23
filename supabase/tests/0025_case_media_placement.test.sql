-- Behaviour tests for 0025_case_media_placement.sql.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set kase1  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaab1'
\set kase2  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaab2'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true
  where id=:'author';

\echo ''
\echo '### 1. each valid placement is accepted'
insert into public.cases (id, author_id, title, short_caption, media_url, media_placement)
values (:'kase1', :'author', 'Placed under actions', 'caption', 'https://x/clip.mp4', 'actions');
select test.check(
  '0025.1 actions placement stored',
  (select media_placement from public.cases where id = :'kase1'),
  'actions');

\echo ''
\echo '### 2. a case with no placement (existing rows) is still fine'
insert into public.cases (id, author_id, title, short_caption)
values (:'kase2', :'author', 'No media', 'caption');
select test.check(
  '0025.2 media_placement defaults to null',
  coalesce((select media_placement from public.cases where id = :'kase2'), '<null>'),
  '<null>');

\echo ''
\echo '### 3. an unknown placement is rejected'
select test.expect_error(
  '0025.3 check constraint rejects a made-up placement',
  $$insert into public.cases (author_id, title, short_caption, media_placement)
    values ('11111111-1111-1111-1111-111111111111', 'x', 'x', 'sidebar')$$);

reset role;
