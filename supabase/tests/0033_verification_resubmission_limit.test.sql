-- Behaviour tests for 0033_verification_resubmission_limit.sql.
-- The property: a rejected member can resubmit (rejected -> pending) up to
-- 3 times inside a rolling 30-day window; the 4th attempt inside that
-- window is rejected; once the oldest attempt ages past 30 days, a new
-- resubmission is allowed again. Also: attempt rows are readable by their
-- own profile and by an admin, not by anyone else.
\set ON_ERROR_STOP off

\set a '77777777-7777-7777-7777-777777777777'
\set b '88888888-8888-8888-8888-888888888888'

reset role;
insert into auth.users (id, email) values
  (:'a','verifyattemptA@x.com'), (:'b','verifyattemptB@x.com')
  on conflict (id) do nothing;
delete from public.verification_attempts where profile_id in (:'a',:'b');
update public.profiles set handle='verifyattempta', verified=false,
  verification_status='rejected', suspended_at=null where id=:'a';
update public.profiles set handle='verifyattemptb', verified=false,
  verification_status='pending', suspended_at=null where id=:'b';

\echo ''
\echo '### 1. three resubmissions inside 30 days all succeed and are logged'
do $$
begin
  for i in 1..3 loop
    update public.profiles set verification_status = 'pending' where id = '77777777-7777-7777-7777-777777777777';
    update public.profiles set verification_status = 'rejected' where id = '77777777-7777-7777-7777-777777777777';
  end loop;
end $$;
select test.check(
  '0033.1 three attempts recorded',
  (select count(*)::text from public.verification_attempts where profile_id = :'a'),
  '3');

\echo ''
\echo '### 2. a 4th resubmission inside the same 30 days is rejected'
select test.expect_error(
  '0033.2 4th resubmission within 30 days raises',
  $$update public.profiles set verification_status = 'pending' where id = '77777777-7777-7777-7777-777777777777'$$);
select test.check(
  '0033.2b still only three attempts recorded (the failed 4th did not insert)',
  (select count(*)::text from public.verification_attempts where profile_id = :'a'),
  '3');
select test.check(
  '0033.2c status stayed rejected (the failed update did not partially apply)',
  (select verification_status from public.profiles where id = :'a'),
  'rejected');

\echo ''
\echo '### 3. once the oldest attempts age past 30 days, a new resubmission is allowed'
update public.verification_attempts
  set created_at = now() - interval '31 days'
  where profile_id = :'a';
update public.profiles set verification_status = 'pending' where id = :'a';
select test.check(
  '0033.3 resubmission succeeds once prior attempts are 30+ days old',
  (select verification_status from public.profiles where id = :'a'),
  'pending');
select test.check(
  '0033.3b a 4th attempt row now exists',
  (select count(*)::text from public.verification_attempts where profile_id = :'a'),
  '4');

\echo ''
\echo '### 4. attempt rows are visible to their own profile and to an admin, not to anyone else'
update public.profiles set is_admin = true where id = :'b';
set role authenticated;
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select test.check(
  '0033.4a the member can see their own attempt history',
  (select count(*)::text from public.verification_attempts where profile_id = '77777777-7777-7777-7777-777777777777'),
  '4');
reset role;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
select test.check(
  '0033.4b an admin can see someone else''s attempt history',
  (select count(*)::text from public.verification_attempts where profile_id = '77777777-7777-7777-7777-777777777777'),
  '4');
reset role;

\set c '99999999-9999-9999-9999-999999999999'
insert into auth.users (id, email) values (:'c','verifyattemptC@x.com') on conflict (id) do nothing;
update public.profiles set handle='verifyattemptc', verified=false,
  verification_status='pending', is_admin=false, suspended_at=null where id=:'c';
set role authenticated;
set request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
select test.check(
  '0033.4c a non-admin, non-owner cannot see another member''s attempt history',
  (select count(*)::text from public.verification_attempts where profile_id = '77777777-7777-7777-7777-777777777777'),
  '0');
reset role;

update public.profiles set is_admin = false where id = :'b';
delete from public.verification_attempts where profile_id in (:'a',:'b',:'c');
