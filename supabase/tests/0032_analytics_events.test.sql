-- Behaviour tests for 0032_analytics_events.sql.
\set ON_ERROR_STOP off

\set member '33333333-4444-5555-6666-777777777777'
\set other  '44444444-5555-6666-7777-888888888888'
\set admin  '88888888-9999-aaaa-bbbb-cccccccccccc'

reset role;
insert into auth.users (id, email) values
  (:'member','analyticsmember@x.com'), (:'other','analyticsother@x.com'), (:'admin','analyticsadmin@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='analyticsmember', is_admin=false where id=:'member';
update public.profiles set handle='analyticsother', is_admin=false where id=:'other';
update public.profiles set handle='analyticsadmin', is_admin=true where id=:'admin';
delete from public.analytics_events where user_id in (:'member',:'other',:'admin') or event_type = 'welcome_viewed_test';

\echo ''
\echo '### 1. a signed-out visitor can log an event (user_id left null)'
set role anon;
insert into public.analytics_events (event_type, user_id) values ('welcome_viewed_test', null);

\echo ''
\echo '### 2. a signed-in member can log an event as themselves'
set role authenticated;
set request.jwt.claim.sub = '33333333-4444-5555-6666-777777777777';
insert into public.analytics_events (event_type, user_id) values ('case_created', :'member');

\echo ''
\echo '### 3. a member cannot log an event claiming to be someone else'
select test.expect_error(
  '0032.3 cannot spoof another user_id',
  $$insert into public.analytics_events (event_type, user_id) values
    ('reaction_toggled', '44444444-5555-6666-7777-888888888888')$$);

\echo ''
\echo '### 4. an ordinary member cannot read events'
select test.check(
  '0032.4 member sees none',
  (select count(*)::text from public.analytics_events where event_type in ('welcome_viewed_test','case_created')),
  '0');

\echo ''
\echo '### 5. an admin can read them'
set request.jwt.claim.sub = '88888888-9999-aaaa-bbbb-cccccccccccc';
select test.check(
  '0032.5 admin sees both events',
  (select count(*)::text from public.analytics_events where event_type in ('welcome_viewed_test','case_created')),
  '2');

reset role;
delete from public.analytics_events where user_id in (:'member',:'other',:'admin') or event_type = 'welcome_viewed_test';
