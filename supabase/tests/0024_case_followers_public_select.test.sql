-- Behaviour tests for 0024_case_followers_public_select.sql.
\set ON_ERROR_STOP off

\set follower '11111111-1111-1111-1111-111111111111'
\set other    '22222222-2222-2222-2222-222222222222'
\set kase     '33333333-3333-3333-3333-333333333333'

reset role;
insert into auth.users (id, email) values (:'follower','follower@x.com'), (:'other','other@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Follower', handle='follower', verified=true, suspended_at=null
  where id=:'follower';
update public.profiles set full_name='Other', handle='other', verified=true, suspended_at=null
  where id=:'other';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'follower', 'Two ACE inhibitors', 'caption')
  on conflict (id) do nothing;

delete from public.case_followers where case_id = :'kase';

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.case_followers (case_id, user_id) values (:'kase', :'follower');

\echo ''
\echo '### 1. a different signed-in user can see someone else''s case_followers row'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0024.1 non-follower sees the row',
  (select count(*)::text from public.case_followers where case_id = :'kase'),
  '1');

\echo ''
\echo '### 2. an anonymous viewer can see it too (the count/avatars work signed out)'
set role anon;
select test.check(
  '0024.2 anon sees the row',
  (select count(*)::text from public.case_followers where case_id = :'kase'),
  '1');

\echo ''
\echo '### 3. the other user still cannot follow on the follower''s behalf'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0024.3 insert_own still blocks following as someone else',
  $$insert into public.case_followers (case_id, user_id)
    values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111')$$);

reset role;
