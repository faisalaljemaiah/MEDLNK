-- Behaviour tests for 0021_locale_preference.sql.
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'

reset role;
insert into auth.users (id, email) values (:'member','member@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='localemember', verified=true, suspended_at=null
  where id=:'member';

\echo ''
\echo '### 1. existing profiles default to English'
select test.check(
  '0021.1 defaults to en',
  (select locale from public.profiles where id=:'member'),
  'en');

\echo ''
\echo '### 2. a member can switch their own locale to Arabic'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set locale = 'ar' where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0021.2 member can set their own locale',
  (select locale from public.profiles where id=:'member'),
  'ar');

\echo ''
\echo '### 3. an unsupported locale is rejected'
select test.expect_error(
  '0021.3 check constraint rejects an unsupported locale',
  $$update public.profiles set locale = 'fr' where id = '11111111-1111-1111-1111-111111111111'$$);

reset role;
update public.profiles set locale = 'en' where id=:'member';
