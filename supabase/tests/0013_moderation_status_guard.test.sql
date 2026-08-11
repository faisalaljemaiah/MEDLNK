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
\echo '### 1. the author un-removing their own case -- MUST FAIL'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.cases set moderation_status='visible' where id=:'kase';

\echo ''
\echo '### 2. ...and it is still removed -- expect removed'
reset role;
select moderation_status as after_author_attempt from public.cases where id=:'kase';

\echo ''
\echo '### 3. the author editing the text of a removed case -- MUST SUCCEED'
-- The guard is about one column. An author keeping ownership of their own
-- writing is the behaviour 0004 intended and this must not break it.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.cases set title='Removed case, edited' where id=:'kase';
select title from public.cases where id=:'kase';

\echo ''
\echo '### 4. an update that resends the unchanged status -- MUST SUCCEED'
-- is distinct from, not a blanket "was this column in the statement": a normal
-- full-row write from the app must not trip the guard.
update public.cases set title='Edited twice', moderation_status='removed'
  where id=:'kase';
select title from public.cases where id=:'kase';

\echo ''
\echo '### 5. an admin restoring the case -- MUST SUCCEED'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.cases set moderation_status='visible' where id=:'kase';
reset role;
select moderation_status as after_admin from public.cases where id=:'kase';

\echo ''
\echo '### 6. the same guard on comments -- MUST FAIL for the author'
reset role;
delete from public.comments where case_id=:'kase';
insert into public.comments (case_id, user_id, body, moderation_status)
values (:'kase', :'author', 'removed reply', 'removed');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.comments set moderation_status='visible' where case_id=:'kase';

\echo ''
\echo '### 7. ...and the reply is still removed -- expect removed'
reset role;
select moderation_status as comment_status from public.comments where case_id=:'kase';

\echo ''
\echo '### 8. an author relabelling their own removed reply -- MUST SUCCEED'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.comments set label='teaching' where case_id=:'kase';
reset role;
select label as comment_label from public.comments where case_id=:'kase';

reset role;
delete from public.cases where id=:'kase';
