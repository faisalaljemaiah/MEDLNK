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
\echo '### 1. every existing profile defaults to off -- expect 0 on'
select count(*) as student_mode_on from public.profiles where student_mode;

\echo ''
\echo '### 2. a member turns it on for themselves -- expect t'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.profiles set student_mode = true where id = :'reader';
select student_mode from public.profiles where id = :'reader';

\echo ''
\echo '### 3. turning it on for somebody else -- must change nothing'
update public.profiles set student_mode = true where id = :'author';
reset role;
select student_mode as author_untouched from public.profiles where id = :'author';

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
select student_mode as unverified_can_set from public.profiles where id = :'author';

reset role;
update public.profiles set verified = true, student_mode = false
  where id in (:'author', :'reader');
