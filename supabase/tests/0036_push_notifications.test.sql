-- Security + behaviour tests for 0036_push_notifications.sql.
--
-- Two things to check: push_subscriptions is own-rows-only end to end
-- (select/insert/update-on-conflict/delete), and the return-type change on
-- the fan_out_* functions plus the three new notify_* functions actually hand
-- back the right recipient id(s) rather than just silently still inserting.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set alice '11111111-1111-1111-1111-111111111111'
\set bob   '22222222-2222-2222-2222-222222222222'
\set carol '33333333-3333-3333-3333-333333333333'
\set kase  '44444444-4444-4444-4444-444444444444'
\set conv  '55555555-5555-5555-5555-555555555555'

reset role;
insert into auth.users (id, email) values
  (:'alice','alice@x.com'), (:'bob','bob@x.com'), (:'carol','carol@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Alice', handle='alice', verified=true, suspended_at=null where id=:'alice';
update public.profiles set full_name='Bob', handle='bob', verified=true, suspended_at=null where id=:'bob';
update public.profiles set full_name='Carol', handle='carol', verified=true, suspended_at=null where id=:'carol';

delete from public.push_subscriptions where user_id in (:'alice', :'bob');
delete from public.notifications where user_id in (:'alice', :'bob', :'carol');
delete from public.case_followers where case_id = :'kase';
delete from public.cases where id = :'kase';
delete from public.messages where conversation_id = :'conv';
delete from public.conversations where id = :'conv';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'alice', 'A case to comment on', 'caption')
  on conflict (id) do nothing;
insert into public.case_followers (case_id, user_id) values (:'kase', :'bob')
  on conflict do nothing;
insert into public.conversations (id, user_a, user_b) values (:'conv', :'alice', :'bob')
  on conflict (id) do nothing;

\echo ''
\echo '### 1. a member can subscribe their own browser to push'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
values (:'alice', 'https://push.example/ep-1', 'p256dh-1', 'auth-1');
reset role;
select test.check(
  '0036.1 subscription recorded',
  (select count(*)::text from public.push_subscriptions where user_id = :'alice'),
  '1');

\echo ''
\echo '### 2. a member cannot subscribe on someone elses behalf'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0036.2 cannot insert a subscription for another user',
  $$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
    values ('22222222-2222-2222-2222-222222222222', 'https://push.example/ep-2', 'p', 'a')$$);
reset role;

\echo ''
\echo '### 3. re-registering the same endpoint upserts rather than duplicating'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
values (:'alice', 'https://push.example/ep-1', 'p256dh-1-rotated', 'auth-1')
on conflict (user_id, endpoint) do update set p256dh = excluded.p256dh;
reset role;
select test.check(
  '0036.3 upsert does not duplicate the row',
  (select count(*)::text from public.push_subscriptions where user_id = :'alice'),
  '1');
select test.check(
  '0036.3 ...and does update the keys',
  (select p256dh from public.push_subscriptions where user_id = :'alice'),
  'p256dh-1-rotated');

\echo ''
\echo '### 4. a member cannot see anothers subscriptions'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0036.4 bob cannot see alices subscription',
  (select count(*)::text from public.push_subscriptions where user_id = :'alice'),
  '0');
reset role;

\echo ''
\echo '### 5. a member can delete their own subscription'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
delete from public.push_subscriptions where user_id = :'alice';
reset role;
select test.check(
  '0036.5 subscription removed',
  (select count(*)::text from public.push_subscriptions where user_id = :'alice'),
  '0');

\echo ''
\echo '### 6. fan_out_case_update now returns who it notified'
delete from public.notifications where case_id = :'kase';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0036.6 fan_out_case_update returns the following bobs id',
  (select string_agg(fan_out_case_update::text, ',') from public.fan_out_case_update(:'kase', 'case_update', 'update')),
  :'bob');
reset role;

\echo ''
\echo '### 7. notify_new_follower returns the followee, and inserts for them'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0036.7 returns carols id',
  (select public.notify_new_follower(:'carol')::text),
  :'carol');
reset role;
select test.check(
  '0036.7 ...and a notification row landed for carol',
  (select count(*)::text from public.notifications where user_id = :'carol' and type = 'new_follower'),
  '1');

\echo ''
\echo '### 8. notify_new_follower refuses to notify yourself'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0036.8 following yourself is not a thing',
  (select (public.notify_new_follower(:'alice') is null)::text),
  'true');
reset role;

\echo ''
\echo '### 9. notify_new_comment notifies the case author, not the commenter'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0036.9 returns the case author (alice)',
  (select public.notify_new_comment(:'kase')::text),
  :'alice');
reset role;
select test.check(
  '0036.9 ...and alice got a notification',
  (select count(*)::text from public.notifications where user_id = :'alice' and type = 'new_comment'),
  '1');

\echo ''
\echo '### 10. notify_new_comment is a no-op when the author replies to their own case'
delete from public.notifications where type = 'new_comment';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0036.10 replying to your own case notifies nobody',
  (select (public.notify_new_comment(:'kase') is null)::text),
  'true');
reset role;
select test.check(
  '0036.10 ...no row inserted',
  (select count(*)::text from public.notifications where type = 'new_comment'),
  '0');

\echo ''
\echo '### 11. notify_new_message notifies the other participant'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0036.11 returns bobs id',
  (select public.notify_new_message(:'conv')::text),
  :'bob');
reset role;
select test.check(
  '0036.11 ...and bob got a notification',
  (select count(*)::text from public.notifications where user_id = :'bob' and type = 'new_message'),
  '1');

\echo ''
\echo '### 12. notify_new_message on a conversation you are not part of returns nothing'
delete from public.notifications where type = 'new_message';
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select test.check(
  '0036.12 a non-participant gets no recipient back',
  (select (public.notify_new_message(:'conv') is null)::text),
  'true');
reset role;
select test.check(
  '0036.12 ...and nothing was inserted',
  (select count(*)::text from public.notifications where type = 'new_message'),
  '0');

reset role;
delete from public.push_subscriptions where user_id in (:'alice', :'bob');
delete from public.notifications where user_id in (:'alice', :'bob', :'carol');
delete from public.case_followers where case_id = :'kase';
delete from public.cases where id = :'kase';
delete from public.messages where conversation_id = :'conv';
delete from public.conversations where id = :'conv';
