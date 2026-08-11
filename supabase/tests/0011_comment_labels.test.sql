-- Behaviour tests for 0011_comment_labels.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set kase   '33333333-3333-3333-3333-333333333333'

-- Fixtures, as superuser. The runner applies every migration to one database,
-- so these rows may already exist from an earlier test file.
reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'reader','reader@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true, suspended_at=null
  where id=:'author';
update public.profiles set full_name='Reader', handle='reader', verified=true, suspended_at=null
  where id=:'reader';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'Two ACE inhibitors', 'caption')
  on conflict (id) do nothing;

delete from public.comments where case_id = :'kase';

\echo ''
\echo '### 1. every defined label stores'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.comments (case_id, user_id, body, label) values
  (:'kase', :'reader', 'Same here.',            'agree'),
  (:'kase', :'reader', 'I would have waited.',  'differ'),
  (:'kase', :'reader', 'Why not amlodipine?',   'question'),
  (:'kase', :'reader', 'Watch for hyperkalaemia.', 'teaching'),
  (:'kase', :'reader', 'See NICE NG136.',       'evidence');
select test.check(
  '0011.1 all five labels store',
  (select count(*)::text from public.comments where case_id = :'kase'),
  '5');

\echo ''
\echo '### 2. an unlabelled reply is still valid'
insert into public.comments (case_id, user_id, body)
values (:'kase', :'reader', 'Just thinking out loud.');
select test.check(
  '0011.2 null label accepted',
  (select count(*)::text from public.comments where case_id = :'kase'),
  '6');

\echo ''
\echo '### 3. an invented label must be rejected'
select test.expect_error(
  '0011.3 unknown label rejected',
  $$insert into public.comments (case_id, user_id, body, label)
    values ('33333333-3333-3333-3333-333333333333',
            '22222222-2222-2222-2222-222222222222', 'nope', 'lgtm')$$);

\echo ''
\echo '### 4. commenting as somebody else must be refused'
select test.expect_error(
  '0011.4 can only comment as yourself',
  $$insert into public.comments (case_id, user_id, body, label)
    values ('33333333-3333-3333-3333-333333333333',
            '11111111-1111-1111-1111-111111111111', 'not me', 'agree')$$);

\echo ''
\echo '### 5. relabelling your own reply works'
update public.comments set label = 'teaching'
  where case_id = :'kase' and user_id = :'reader' and label = 'agree';
select test.check(
  '0011.5 author can relabel their own reply',
  (select label from public.comments where case_id = :'kase' and body = 'Same here.'),
  'teaching');

\echo ''
\echo '### 6. relabelling somebody elses reply changes nothing'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.comments set label = 'evidence'
  where case_id = :'kase' and body = 'Why not amlodipine?';
select test.check(
  '0011.6 cannot relabel someone elses reply',
  (select label from public.comments
     where case_id = :'kase' and body = 'Why not amlodipine?'),
  'question');

\echo ''
\echo '### 7. a removed reply is hidden from other members'
reset role;
update public.comments set moderation_status = 'removed'
  where case_id = :'kase' and body = 'See NICE NG136.';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0011.7 removed reply hidden from others',
  (select count(*)::text from public.comments where case_id = :'kase'),
  '5');

\echo ''
\echo '### 8. ...but its author still sees it'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0011.8 author still sees their removed reply',
  (select count(*)::text from public.comments where case_id = :'kase'),
  '6');

\echo ''
\echo '### 9. a suspended member cannot reply'
reset role;
update public.profiles set suspended_at = now() where id = :'reader';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0011.9 suspension blocks replying',
  $$insert into public.comments (case_id, user_id, body, label)
    values ('33333333-3333-3333-3333-333333333333',
            '22222222-2222-2222-2222-222222222222', 'still here?', 'agree')$$);

reset role;
update public.profiles set suspended_at = null where id = :'reader';
