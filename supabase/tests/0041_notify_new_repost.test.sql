-- Behaviour tests for 0041_notify_new_repost.sql.
--
-- Same shape as 0040's notify_new_reaction tests: notifies the case author,
-- never the reposter themselves, and writes a 'new_repost' row alongside the
-- id it returns for push.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set kase   '77777777-8888-8888-8888-888888888888'

reset role;
insert into auth.users (id, email) values
  (:'author','author@x.com'), (:'reader','reader@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true, suspended_at=null where id=:'author';
update public.profiles set full_name='Reader', handle='reader', verified=true, suspended_at=null where id=:'reader';

delete from public.notifications where type = 'new_repost';
delete from public.cases where id = :'kase';
insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'A case to repost', 'caption')
  on conflict (id) do nothing;

\echo ''
\echo '### 1. a repost notifies the case author'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0041.1 returns the case author',
  (select public.notify_new_repost(:'kase')::text),
  :'author');
reset role;
select test.check(
  '0041.1 ...and a new_repost notification landed',
  (select count(*)::text from public.notifications where user_id = :'author' and type = 'new_repost'),
  '1');

\echo ''
\echo '### 2. reposting your own case does not notify yourself'
delete from public.notifications where type = 'new_repost';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0041.2 self-repost returns nothing',
  (select (public.notify_new_repost(:'kase') is null)::text),
  'true');
reset role;
select test.check(
  '0041.2 ...and inserts nothing',
  (select count(*)::text from public.notifications where type = 'new_repost'),
  '0');

reset role;
delete from public.notifications where type = 'new_repost';
delete from public.cases where id = :'kase';
