-- Security tests for 0018_profiles_privilege_guard.sql.
--
-- The property: a member cannot grant themselves admin, verification, or an
-- unsuspend by PATCHing their own profile row directly.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'
\set admin  '77777777-7777-7777-7777-777777777777'

reset role;
insert into auth.users (id, email) values (:'member','member@x.com'), (:'admin','admin@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Member', handle='guardmember', verified=false,
  verification_status='pending', suspended_at=null, suspended_reason=null, is_admin=false
  where id=:'member';
update public.profiles set full_name='Admin', handle='guardadmin', verified=true,
  verification_status='approved', suspended_at=null, is_admin=true where id=:'admin';

\echo ''
\echo '### 1. a member must not be able to self-promote to admin'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0018.1 cannot self-set is_admin',
  $$update public.profiles set is_admin = true where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 2. ...and is_admin is still false'
reset role;
select test.check(
  '0018.2 is_admin unchanged',
  (select is_admin::text from public.profiles where id=:'member'),
  'false');

\echo ''
\echo '### 3. a member must not be able to self-approve verification'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0018.3 cannot self-set verified/verification_status',
  $$update public.profiles set verified = true, verification_status = 'approved'
    where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 4. ...and verification is unchanged'
reset role;
select test.check(
  '0018.4 verification unchanged',
  (select verification_status from public.profiles where id=:'member'),
  'pending');

\echo ''
\echo '### 5. a suspended member must not be able to self-unsuspend'
update public.profiles set suspended_at = now(), suspended_reason = 'test'
  where id = :'member';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0018.5 cannot self-clear suspension',
  $$update public.profiles set suspended_at = null where id = '11111111-1111-1111-1111-111111111111'$$);

\echo ''
\echo '### 6. ...and the suspension survives'
reset role;
select test.check(
  '0018.6 suspension survives the attempt',
  (select suspended_at is not null from public.profiles where id=:'member')::text,
  'true');
update public.profiles set suspended_at = null, suspended_reason = null where id=:'member';

\echo ''
\echo '### 7. a member can still edit their own ordinary fields'
-- The guard is about five columns. Everything else 0004 already lets a
-- member change about themselves must keep working.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set full_name = 'Member Updated', city = 'Riyadh'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0018.7 member still owns their own ordinary fields',
  (select full_name from public.profiles where id=:'member'),
  'Member Updated');

\echo ''
\echo '### 8. resending the unchanged privileged values is fine'
-- is distinct from, not "were these columns in the statement": a normal
-- full-row write from the app (e.g. onboarding resubmitting the whole form)
-- must not trip the guard just because it echoes the existing values back.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles
  set full_name = 'Member Resent', is_admin = false, verified = false,
      verification_status = 'pending', suspended_at = null, suspended_reason = null
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0018.8 resending unchanged privileged values does not trip the guard',
  (select full_name from public.profiles where id=:'member'),
  'Member Resent');

\echo ''
\echo '### 9. an admin can approve another members verification'
set role authenticated;
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.profiles set verified = true, verification_status = 'approved'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0018.9 admin can approve someone else',
  (select verification_status from public.profiles where id=:'member'),
  'approved');

\echo ''
\echo '### 10. an admin can suspend another member'
set role authenticated;
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.profiles set suspended_at = now(), suspended_reason = 'admin action'
  where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0018.10 admin can suspend someone else',
  (select suspended_at is not null from public.profiles where id=:'member')::text,
  'true');
update public.profiles set suspended_at = null, suspended_reason = null where id=:'member';

\echo ''
\echo '### 11. a trusted server-side role can still set the privileged columns'
-- Aimed at the browser, not at the owner or service_role — catching those
-- would block the signup trigger's own bootstrap and admin tooling that
-- connects as service_role. Mirrors 0013.9.
reset role;
update public.profiles set is_admin = true where id = :'member';
select test.check(
  '0018.11 superuser/service_role is not blocked',
  (select is_admin::text from public.profiles where id=:'member'),
  'true');
update public.profiles set is_admin = false where id=:'member';

reset role;
