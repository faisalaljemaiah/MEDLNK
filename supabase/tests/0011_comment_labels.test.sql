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
\echo '### 1. every defined label stores -- expect 5 rows'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.comments (case_id, user_id, body, label) values
  (:'kase', :'reader', 'Same here.',            'agree'),
  (:'kase', :'reader', 'I would have waited.',  'differ'),
  (:'kase', :'reader', 'Why not amlodipine?',   'question'),
  (:'kase', :'reader', 'Watch for hyperkalaemia.', 'teaching'),
  (:'kase', :'reader', 'See NICE NG136.',       'evidence');
select count(*) as labelled from public.comments where case_id = :'kase';

\echo ''
\echo '### 2. an unlabelled reply is still valid -- expect 6 rows'
insert into public.comments (case_id, user_id, body)
values (:'kase', :'reader', 'Just thinking out loud.');
select count(*) as total from public.comments where case_id = :'kase';

\echo ''
\echo '### 3. an invented label -- MUST FAIL (check constraint)'
insert into public.comments (case_id, user_id, body, label)
values (:'kase', :'reader', 'nope', 'lgtm');

\echo ''
\echo '### 4. commenting as somebody else -- MUST FAIL (RLS)'
insert into public.comments (case_id, user_id, body, label)
values (:'kase', :'author', 'not me', 'agree');

\echo ''
\echo '### 5. relabelling your own reply -- expect teaching'
update public.comments set label = 'teaching'
  where case_id = :'kase' and user_id = :'reader' and label = 'agree';
select label from public.comments
  where case_id = :'kase' and body = 'Same here.';

\echo ''
\echo '### 6. relabelling somebody elses reply -- must change nothing'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.comments set label = 'evidence'
  where case_id = :'kase' and body = 'Why not amlodipine?';
select label as still_question from public.comments
  where case_id = :'kase' and body = 'Why not amlodipine?';

\echo ''
\echo '### 7. a removed reply is hidden from other members -- expect 5 of 6'
reset role;
update public.comments set moderation_status = 'removed'
  where case_id = :'kase' and body = 'See NICE NG136.';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select count(*) as visible_to_others from public.comments where case_id = :'kase';

\echo ''
\echo '### 8. ...but its author still sees it -- expect 6'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as visible_to_author from public.comments where case_id = :'kase';

\echo ''
\echo '### 9. a suspended member replying -- MUST FAIL'
reset role;
update public.profiles set suspended_at = now() where id = :'reader';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.comments (case_id, user_id, body, label)
values (:'kase', :'reader', 'still here?', 'agree');

reset role;
update public.profiles set suspended_at = null where id = :'reader';
