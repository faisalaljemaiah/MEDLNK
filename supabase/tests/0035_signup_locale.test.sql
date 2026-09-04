-- Tests for 0035_signup_locale.sql.
--
-- handle_new_user() fires on every insert into auth.users, so these are the
-- only tests in this file — no separate RLS section, since nothing about
-- privilege changed here, only what the trigger writes.
\set ON_ERROR_STOP off

\set ar_user  '88888888-8888-8888-8888-888888888801'
\set en_user  '88888888-8888-8888-8888-888888888802'
\set bad_user '88888888-8888-8888-8888-888888888803'
\set no_meta  '88888888-8888-8888-8888-888888888804'

reset role;

insert into auth.users (id, email, raw_user_meta_data) values
  (:'ar_user', 'ar@x.com', '{"locale": "ar"}'::jsonb);
insert into auth.users (id, email, raw_user_meta_data) values
  (:'en_user', 'en@x.com', '{"locale": "en"}'::jsonb);
insert into auth.users (id, email, raw_user_meta_data) values
  (:'bad_user', 'bad@x.com', '{"locale": "fr"}'::jsonb);
insert into auth.users (id, email) values (:'no_meta', 'nometa@x.com');

\echo ''
\echo '### 1. signing up with locale=ar sets the profile to Arabic'
select test.check(
  '0035.1 ar signup gets ar locale',
  (select locale from public.profiles where id = :'ar_user'),
  'ar');

\echo ''
\echo '### 2. signing up with locale=en sets the profile to English'
select test.check(
  '0035.2 en signup gets en locale',
  (select locale from public.profiles where id = :'en_user'),
  'en');

\echo ''
\echo '### 3. an unrecognized locale value falls back to the column default'
select test.check(
  '0035.3 unrecognized locale falls back to en',
  (select locale from public.profiles where id = :'bad_user'),
  'en');

\echo ''
\echo '### 4. no metadata at all (a signup predating this) still gets a row'
select test.check(
  '0035.4 missing metadata falls back to en',
  (select locale from public.profiles where id = :'no_meta'),
  'en');
reset role;
