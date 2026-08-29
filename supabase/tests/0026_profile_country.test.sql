-- Behaviour tests for 0026_profile_country.sql.
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'

reset role;
insert into auth.users (id, email) values (:'member','member@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='countrymember', verified=true, suspended_at=null,
  country_code = null
  where id=:'member';

\echo ''
\echo '### 1. a member can set their own country'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set country_code = 'SA' where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0026.1 member can set their own country',
  (select country_code from public.profiles where id=:'member'),
  'SA');

\echo ''
\echo '### 2. a two-letter code that is not real still stores (list lives in app code, not the DB)'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set country_code = 'ZZ' where id = '11111111-1111-1111-1111-111111111111';
reset role;
select test.check(
  '0026.2 shape-only check accepts any two letters',
  (select country_code from public.profiles where id=:'member'),
  'ZZ');

\echo ''
\echo '### 3. the wrong shape is rejected'
select test.expect_error(
  '0026.3 check constraint rejects a non two-letter value',
  $$update public.profiles set country_code = 'Saudi' where id = '11111111-1111-1111-1111-111111111111'$$);

reset role;
update public.profiles set country_code = null where id=:'member';
