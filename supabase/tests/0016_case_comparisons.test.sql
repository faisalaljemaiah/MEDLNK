-- Behaviour tests for 0016_case_comparisons.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set post   'cccccccc-0000-0000-0000-00000000000a'
\set left   'cccccccc-0000-0000-0000-00000000000b'
\set right  'cccccccc-0000-0000-0000-00000000000c'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'reader','reader@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='author', verified=true, suspended_at=null where id=:'author';
update public.profiles set handle='reader', verified=true, suspended_at=null where id=:'reader';

delete from public.cases where id in (:'post', :'left', :'right');
insert into public.cases (id, author_id, title, short_caption, case_type) values
  (:'post',  :'author', 'Two chest pains',   'caption', 'case_vs_case'),
  (:'left',  :'author', 'Chest pain A',      'caption', 'clinical_case'),
  (:'right', :'reader', 'Chest pain B',      'caption', 'clinical_case');

\echo ''
\echo '### 1. the post author records a comparison'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
values (:'post', :'left', :'right', 'The troponin trend, not the ECG.');
select test.check(
  '0016.1 comparison recorded',
  (select count(*)::text from public.case_comparisons where case_id = :'post'),
  '1');

\echo ''
\echo '### 2. it can point at somebody elses case'
-- Deliberate: comparing your case to a colleague's is the interesting version,
-- and the sides are references, not copies.
select test.check(
  '0016.2 either side may belong to another author',
  (select (right_case_id = :'right')::text from public.case_comparisons
     where case_id = :'post'),
  'true');

\echo ''
\echo '### 3. a second comparison on the same post must be rejected'
select test.expect_error(
  '0016.3 one comparison per post',
  $$insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
    values ('cccccccc-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-00000000000c',
            'cccccccc-0000-0000-0000-00000000000b', 'again')$$);

\echo ''
\echo '### 4. a case compared with itself must be rejected'
reset role;
delete from public.case_comparisons where case_id = :'post';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0016.4 the two sides must differ',
  $$insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
    values ('cccccccc-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-00000000000b',
            'cccccccc-0000-0000-0000-00000000000b', 'same thing twice')$$);

\echo ''
\echo '### 5. a post that compares itself must be rejected'
select test.expect_error(
  '0016.5 a post cannot be one of its own sides',
  $$insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
    values ('cccccccc-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-00000000000b', 'self')$$);

\echo ''
\echo '### 6. a non-author must not be able to attach a comparison'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0016.6 only the post author attaches the comparison',
  $$insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
    values ('cccccccc-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-00000000000b',
            'cccccccc-0000-0000-0000-00000000000c', 'not my post')$$);

\echo ''
\echo '### 7. a suspended author must not be able to attach one'
reset role;
update public.profiles set suspended_at = now() where id = :'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0016.7 suspension blocks attaching a comparison',
  $$insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
    values ('cccccccc-0000-0000-0000-00000000000a',
            'cccccccc-0000-0000-0000-00000000000b',
            'cccccccc-0000-0000-0000-00000000000c', 'while suspended')$$);
reset role;
update public.profiles set suspended_at = null where id = :'author';

\echo ''
\echo '### 8. deleting a compared case removes the comparison'
-- on delete cascade on both sides: a comparison with a missing arm would
-- render as half a post, which is worse than not rendering at all.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.case_comparisons (case_id, left_case_id, right_case_id, discriminator)
values (:'post', :'left', :'right', 'The troponin trend.');
reset role;
delete from public.cases where id = :'right';
select test.check(
  '0016.8 comparison cascades with either side',
  (select count(*)::text from public.case_comparisons where case_id = :'post'),
  '0');

reset role;
delete from public.cases where id in (:'post', :'left', :'right');
