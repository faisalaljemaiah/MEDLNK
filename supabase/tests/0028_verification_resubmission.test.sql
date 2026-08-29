-- Behaviour tests for 0028_verification_resubmission.sql.
--
-- The property: a rejected member can move themselves back to 'pending' (a
-- resubmission), but every other self-driven verification transition 0018
-- already blocked stays blocked.
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'

reset role;
insert into auth.users (id, email) values (:'member','member@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='resubmember', verified=false,
  verification_status='rejected', suspended_at=null where id=:'member';

\echo ''
\echo '### 1. a rejected member can resubmit to pending'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set verification_status = 'pending'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0028.1 rejected -> pending is allowed',
  (select verification_status from public.profiles where id=:'member'),
  'pending');

\echo ''
\echo '### 2. a pending member still cannot self-approve'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0028.2 pending -> approved is still blocked',
  $$update public.profiles set verification_status = 'approved'
    where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 3. a rejected member cannot jump straight to approved'
update public.profiles set verification_status = 'rejected' where id = :'member';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0028.3 rejected -> approved is still blocked',
  $$update public.profiles set verification_status = 'approved'
    where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 4. resubmitting cannot also sneak verified=true through'
reset role;
update public.profiles set verification_status = 'rejected', verified = false where id = :'member';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0028.4 resubmission cannot also flip verified',
  $$update public.profiles set verification_status = 'pending', verified = true
    where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 5. ...and verification is unchanged after that attempt'
reset role;
select test.check(
  '0028.5 verified stayed false after the blocked attempt',
  (select verified::text from public.profiles where id=:'member'),
  'false');

reset role;
update public.profiles set verification_status = 'pending', verified = false where id=:'member';
