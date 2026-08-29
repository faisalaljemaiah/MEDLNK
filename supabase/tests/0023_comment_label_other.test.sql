-- Behaviour tests for 0023_comment_label_other.sql.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set kase   '33333333-3333-3333-3333-333333333333'

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
\echo '### 1. "other" is accepted as a label'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.comments (case_id, user_id, body, label)
values (:'kase', :'reader', 'None of the above, but worth saying.', 'other');
select test.check(
  '0023.1 other label stores',
  (select label from public.comments where case_id = :'kase' and body = 'None of the above, but worth saying.'),
  'other');

\echo ''
\echo '### 2. an existing label is still accepted (constraint was widened, not replaced)'
insert into public.comments (case_id, user_id, body, label)
values (:'kase', :'reader', 'Same here.', 'agree');
select test.check(
  '0023.2 agree still accepted',
  (select count(*)::text from public.comments where case_id = :'kase' and label = 'agree'),
  '1');

\echo ''
\echo '### 3. an unknown label is still rejected'
select test.expect_error(
  '0023.3 check constraint rejects a made-up label',
  $$insert into public.comments (case_id, user_id, body, label)
    values ('33333333-3333-3333-3333-333333333333',
            '22222222-2222-2222-2222-222222222222', 'nope', 'not_a_real_label')$$);

reset role;
