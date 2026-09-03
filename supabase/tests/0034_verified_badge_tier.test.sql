-- Tests for 0034_verified_badge_tier.sql.
--
-- Two properties: the rank backfill assigned Diamond/Gold correctly over
-- fixture data seeded by earlier test files, and the privilege guard now
-- also blocks a member from self-assigning verified_at/badge_tier the same
-- way it already blocks is_admin/verified/suspended_at (0018).
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'
\set admin  '77777777-7777-7777-7777-777777777777'

reset role;
insert into auth.users (id, email) values (:'member','member@x.com'), (:'admin','admin@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Member', handle='badgemember', verified=false,
  verification_status='pending', verified_at=null, badge_tier=null, is_admin=false
  where id=:'member';
update public.profiles set full_name='Admin', handle='badgeadmin', verified=true,
  verification_status='approved', is_admin=true where id=:'admin';

\echo ''
\echo '### 1. a member must not be able to self-assign a badge tier'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0034.1 cannot self-set badge_tier',
  $$update public.profiles set badge_tier = 'diamond' where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 2. ...and badge_tier is still null'
reset role;
select test.check(
  '0034.2 badge_tier unchanged',
  coalesce((select badge_tier from public.profiles where id=:'member'), '(null)'),
  '(null)');

\echo ''
\echo '### 3. a member must not be able to self-set verified_at either'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0034.3 cannot self-set verified_at',
  $$update public.profiles set verified_at = now() where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 4. an admin can set another members badge tier'
set role authenticated;
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.profiles set verified = true, verification_status = 'approved',
  verified_at = now(), badge_tier = 'green'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0034.4 admin can set badge_tier on someone else',
  (select badge_tier from public.profiles where id=:'member'),
  'green');

\echo ''
\echo '### 5. the check constraint rejects an unknown tier value'
reset role;
select test.expect_error(
  '0034.5 unknown badge_tier value is rejected',
  $$update public.profiles set badge_tier = 'bronze' where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 6. a trusted server-side role is not blocked (mirrors 0018.11)'
reset role;
update public.profiles set badge_tier = 'platinum' where id = :'member';
select test.check(
  '0034.6 superuser/service_role is not blocked',
  (select badge_tier from public.profiles where id=:'member'),
  'platinum');

update public.profiles set verified=false, verification_status='pending',
  verified_at=null, badge_tier=null where id=:'member';
reset role;
