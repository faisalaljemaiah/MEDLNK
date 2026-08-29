-- Behaviour tests for 0029_user_blocks.sql.
-- The property: a block actually stops contact (messaging, following), not
-- just something the UI chooses to hide, and only the two participants can
-- see that a block exists between them.
\set ON_ERROR_STOP off

\set a '11111111-1111-1111-1111-111111111111'
\set b '22222222-2222-2222-2222-222222222222'
\set c '33333333-3333-3333-3333-333333333333'

reset role;
insert into auth.users (id, email) values
  (:'a','a@x.com'), (:'b','b@x.com'), (:'c','c@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='blocka', verified=true, suspended_at=null where id=:'a';
update public.profiles set handle='blockb', verified=true, suspended_at=null where id=:'b';
update public.profiles set handle='blockc', verified=true, suspended_at=null where id=:'c';
delete from public.user_blocks where blocker_id in (:'a',:'b',:'c') or blocked_id in (:'a',:'b',:'c');
delete from public.conversations where user_a in (:'a',:'b',:'c') or user_b in (:'a',:'b',:'c');
delete from public.follows where follower_id in (:'a',:'b',:'c') or followee_id in (:'a',:'b',:'c');

\echo ''
\echo '### 1. a member can block another'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.user_blocks (blocker_id, blocked_id) values (:'a', :'b');

\echo ''
\echo '### 2. the blocked side can see the block exists too'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0029.2 blocked side can see the row',
  (select count(*)::text from public.user_blocks where blocker_id=:'a' and blocked_id=:'b'),
  '1');

\echo ''
\echo '### 3. an unrelated third party cannot see the block'
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select test.check(
  '0029.3 third party sees nothing',
  (select count(*)::text from public.user_blocks where blocker_id=:'a' and blocked_id=:'b'),
  '0');

\echo ''
\echo '### 4. the blocked side cannot start a conversation with the blocker'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0029.4 blocked side cannot open a conversation',
  $$insert into public.conversations (user_a, user_b) values
    ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111')$$);

\echo ''
\echo '### 5. the blocker cannot start one either (block is mutual for contact purposes)'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0029.5 blocker side cannot open a conversation',
  $$insert into public.conversations (user_a, user_b) values
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222')$$);

\echo ''
\echo '### 6. the blocked side cannot follow the blocker'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0029.6 blocked side cannot follow the blocker',
  $$insert into public.follows (follower_id, followee_id) values
    ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111')$$);

\echo ''
\echo '### 7. an uninvolved pair can still message and follow normally'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.conversations (user_a, user_b) values (:'a', :'c');
insert into public.follows (follower_id, followee_id) values (:'a', :'c');
reset role;
select test.check(
  '0029.7 unrelated conversation succeeded',
  (select count(*)::text from public.conversations where user_a=:'a' and user_b=:'c'),
  '1');

\echo ''
\echo '### 8. unblocking (delete) is owner-only'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
delete from public.user_blocks where blocker_id=:'a' and blocked_id=:'b';
reset role;
select test.check(
  '0029.8 blocked side cannot delete the block row',
  (select count(*)::text from public.user_blocks where blocker_id=:'a' and blocked_id=:'b'),
  '1');

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
delete from public.user_blocks where blocker_id=:'a' and blocked_id=:'b';
reset role;
select test.check(
  '0029.9 blocker can unblock',
  (select count(*)::text from public.user_blocks where blocker_id=:'a' and blocked_id=:'b'),
  '0');

reset role;
delete from public.conversations where user_a in (:'a',:'b',:'c') or user_b in (:'a',:'b',:'c');
delete from public.follows where follower_id in (:'a',:'b',:'c') or followee_id in (:'a',:'b',:'c');
