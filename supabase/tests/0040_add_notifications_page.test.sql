-- Security + behaviour tests for 0040_add_notifications_page.sql.
--
-- Three things to check: the notifications table is own-rows-only (select
-- and update, no client insert at all — everything lands through a
-- security-definer function), notify_new_follower/notify_new_comment write a
-- row again alongside the id they already returned (0036), and the new
-- notify_new_reaction only fires for the three clinical reaction values —
-- not repost/save, and never for reacting to your own case.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set carol  '33333333-3333-3333-3333-333333333333'
\set kase   '66666666-6666-6666-6666-666666666666'

reset role;
insert into auth.users (id, email) values
  (:'author','author@x.com'), (:'reader','reader@x.com'), (:'carol','carol@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true, suspended_at=null where id=:'author';
update public.profiles set full_name='Reader', handle='reader', verified=true, suspended_at=null where id=:'reader';
update public.profiles set full_name='Carol', handle='carol', verified=true, suspended_at=null where id=:'carol';

delete from public.notifications where user_id in (:'author', :'reader', :'carol');
delete from public.reactions where case_id = :'kase';
delete from public.cases where id = :'kase';
insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'A case to react to', 'caption')
  on conflict (id) do nothing;

\echo ''
\echo '### 1. clients cannot insert their own notifications'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0040.1 notifications are server-written only',
  $$insert into public.notifications (user_id, type, body)
    values ('22222222-2222-2222-2222-222222222222', 'fake', 'spam')$$);
reset role;

\echo ''
\echo '### 2. notify_new_follower returns the followee AND writes a row'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0040.2 returns carols id',
  (select public.notify_new_follower(:'carol')::text),
  :'carol');
reset role;
select test.check(
  '0040.2 ...and a notification landed for carol',
  (select count(*)::text from public.notifications where user_id = :'carol' and type = 'new_follower'),
  '1');

\echo ''
\echo '### 3. notify_new_follower refuses to notify yourself, and inserts nothing'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0040.3 following yourself is not a thing',
  (select (public.notify_new_follower(:'author') is null)::text),
  'true');
reset role;
select test.check(
  '0040.3 ...and nothing was inserted',
  (select count(*)::text from public.notifications where type = 'new_follower' and user_id = :'author'),
  '0');

\echo ''
\echo '### 4. notify_new_comment notifies the case author AND writes a row'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0040.4 returns the case author',
  (select public.notify_new_comment(:'kase')::text),
  :'author');
reset role;
select test.check(
  '0040.4 ...and the author got a notification',
  (select count(*)::text from public.notifications where user_id = :'author' and type = 'new_comment'),
  '1');

\echo ''
\echo '### 5. notify_new_comment is a no-op replying to your own case'
delete from public.notifications where type = 'new_comment';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0040.5 replying to your own case notifies nobody',
  (select (public.notify_new_comment(:'kase') is null)::text),
  'true');
reset role;
select test.check(
  '0040.5 ...no row inserted',
  (select count(*)::text from public.notifications where type = 'new_comment'),
  '0');

\echo ''
\echo '### 6. a clinical reaction notifies the case author'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0040.6 returns the case author',
  (select public.notify_new_reaction(:'kase', 'interesting')::text),
  :'author');
reset role;
select test.check(
  '0040.6 ...and a new_reaction notification landed',
  (select count(*)::text from public.notifications where user_id = :'author' and type = 'new_reaction'),
  '1');

\echo ''
\echo '### 7. repost/save are not "likes" and do not notify'
delete from public.notifications where type = 'new_reaction';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0040.7a repost does not notify',
  (select (public.notify_new_reaction(:'kase', 'repost') is null)::text),
  'true');
select test.check(
  '0040.7b save does not notify',
  (select (public.notify_new_reaction(:'kase', 'save') is null)::text),
  'true');
reset role;
select test.check(
  '0040.7 ...neither inserted a row',
  (select count(*)::text from public.notifications where type = 'new_reaction'),
  '0');

\echo ''
\echo '### 8. reacting to your own case does not notify yourself'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0040.8 self-reaction returns nothing',
  (select (public.notify_new_reaction(:'kase', 'interesting') is null)::text),
  'true');
reset role;
select test.check(
  '0040.8 ...and inserts nothing',
  (select count(*)::text from public.notifications where type = 'new_reaction' and user_id = :'author'),
  '0');

\echo ''
\echo '### 9. a member can read and mark read only their own notifications'
set role authenticated;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select test.check(
  '0040.9a carol can see her own notification',
  (select count(*)::text from public.notifications where user_id = :'carol'),
  '1');
update public.notifications set read_at = now() where user_id = :'carol';
select test.check(
  '0040.9b carol can mark her own notification read',
  (select count(*)::text from public.notifications where user_id = :'carol' and read_at is not null),
  '1');
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0040.9c the author cannot see carols notification',
  (select count(*)::text from public.notifications where user_id = :'carol'),
  '0');
reset role;

reset role;
delete from public.notifications where user_id in (:'author', :'reader', :'carol');
delete from public.reactions where case_id = :'kase';
delete from public.cases where id = :'kase';
