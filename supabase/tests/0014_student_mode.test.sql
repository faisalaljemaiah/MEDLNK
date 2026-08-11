-- Behaviour tests for 0014_student_mode.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'reader','reader@x.com')
  on conflict (id) do nothing;
update public.profiles set verified=true, suspended_at=null, student_mode=false
  where id in (:'author', :'reader');

\echo ''
\echo '### 1. every existing profile defaults to off'
select test.check(
  '0014.1 defaults to off for every existing profile',
  (select count(*)::text from public.profiles where student_mode),
  '0');

\echo ''
\echo '### 2. a member turns it on for themselves'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.profiles set student_mode = true where id = :'reader';
select test.check(
  '0014.2 a member can set it for themselves',
  (select student_mode::text from public.profiles where id = :'reader'),
  'true');

\echo ''
\echo '### 3. turning it on for somebody else changes nothing'
update public.profiles set student_mode = true where id = :'author';
reset role;
select test.check(
  '0014.3 cannot set it for somebody else',
  (select student_mode::text from public.profiles where id = :'author'),
  'false');

\echo ''
\echo '### 4. it is not gated on verification -- a pending member can still set it'
-- Student Mode is a display preference, not a capability. Withholding it from
-- someone waiting on licence approval would be the one group most likely to
-- want it.
reset role;
update public.profiles set verified = false where id = :'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set student_mode = true where id = :'author';
reset role;
select test.check(
  '0014.4 not gated on verification',
  (select student_mode::text from public.profiles where id = :'author'),
  'true');

reset role;
update public.profiles set verified = true, student_mode = false
  where id in (:'author', :'reader');
