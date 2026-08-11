-- Security tests for 0013_moderation_status_guard.sql.
--
-- The property: a moderator's takedown survives contact with the author.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set admin  '77777777-7777-7777-7777-777777777777'
\set kase   'aaaaaaaa-0000-0000-0000-00000000000a'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'admin','admin@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true,
  suspended_at=null, is_admin=false where id=:'author';
update public.profiles set full_name='Admin', handle='admin', verified=true,
  suspended_at=null, is_admin=true where id=:'admin';

delete from public.cases where id=:'kase';
insert into public.cases (id, author_id, title, short_caption, moderation_status)
values (:'kase', :'author', 'Removed case', 'caption', 'removed');

\echo ''
\echo '### 1. the author must not be able to un-remove their own case'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0013.1 author cannot reverse a takedown',
  $$update public.cases set moderation_status='visible' where id='aaaaaaaa-0000-0000-0000-00000000000a'$$);

\echo ''
\echo '### 2. ...and it is still removed'
reset role;
select test.check(
  '0013.2 takedown survives the attempt',
  (select moderation_status from public.cases where id=:'kase'),
  'removed');

\echo ''
\echo '### 3. the author can still edit the text of a removed case'
-- The guard is about one column. An author keeping ownership of their own
-- writing is the behaviour 0004 intended and this must not break it.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.cases set title='Removed case, edited' where id=:'kase';
select test.check(
  '0013.3 author still owns their own text',
  (select title from public.cases where id=:'kase'),
  'Removed case, edited');

\echo ''
\echo '### 4. an update that resends the unchanged status is fine'
-- is distinct from, not a blanket "was this column in the statement": a normal
-- full-row write from the app must not trip the guard.
update public.cases set title='Edited twice', moderation_status='removed'
  where id=:'kase';
select test.check(
  '0013.4 resending the unchanged status does not trip the guard',
  (select title from public.cases where id=:'kase'),
  'Edited twice');

\echo ''
\echo '### 5. an admin can restore the case'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.cases set moderation_status='visible' where id=:'kase';
reset role;
select test.check(
  '0013.5 an admin can still restore',
  (select moderation_status from public.cases where id=:'kase'),
  'visible');

\echo ''
\echo '### 6. the same guard covers comments'
reset role;
delete from public.comments where case_id=:'kase';
insert into public.comments (case_id, user_id, body, moderation_status)
values (:'kase', :'author', 'removed reply', 'removed');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0013.6 author cannot un-remove their own reply',
  $$update public.comments set moderation_status='visible' where case_id='aaaaaaaa-0000-0000-0000-00000000000a'$$);

\echo ''
\echo '### 7. ...and the reply is still removed'
reset role;
select test.check(
  '0013.7 reply takedown survives',
  (select moderation_status from public.comments where case_id=:'kase'),
  'removed');

\echo ''
\echo '### 8. an author can relabel their own removed reply'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.comments set label='teaching' where case_id=:'kase';
reset role;
select test.check(
  '0013.8 author can still relabel their removed reply',
  (select label from public.comments where case_id=:'kase'),
  'teaching');

\echo ''
\echo '### 9. a trusted server-side role can still set the column'
-- The guard is aimed at the browser, not at the owner or service_role. Catching
-- those would block backfills, Edge Functions and admin scripts — and it did:
-- the first version of this trigger broke a superuser test fixture, which is
-- how the over-reach was found.
reset role;
update public.cases set moderation_status='removed' where id=:'kase';
select test.check(
  '0013.9 superuser/service_role is not blocked',
  (select moderation_status from public.cases where id=:'kase'),
  'removed');

reset role;
delete from public.cases where id=:'kase';
