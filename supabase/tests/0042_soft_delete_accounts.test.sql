-- Behaviour tests for 0042_soft_delete_accounts.sql.
--
-- The property: deleted_at blocks every write is_verified()/is_active()
-- already gate (posting, reacting, commenting, following), exactly like
-- suspended_at already does — but it's self-service (a member can set and
-- clear it on their own row) and reversible, unlike suspension.
\set ON_ERROR_STOP off

\set author  '11111111-1111-1111-1111-111111111111'
\set deleted '22222222-2222-2222-2222-222222222222'
\set kase    '99999999-6666-6666-6666-666666666666'

reset role;
insert into auth.users (id, email) values
  (:'author','a0042@x.com'), (:'deleted','d0042@x.com')
  on conflict (id) do nothing;

update public.profiles set full_name='Author0042', handle='author0042', verified=true, suspended_at=null, deleted_at=null where id=:'author';
update public.profiles set full_name='Deleted0042', handle='deleted0042', verified=true, suspended_at=null, deleted_at=null where id=:'deleted';

delete from public.cases where id = :'kase';
insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'Test case for 0042', 'caption')
  on conflict (id) do nothing;

delete from public.reactions where case_id = :'kase';
delete from public.comments where case_id = :'kase';
delete from public.follows where follower_id = :'deleted' and followee_id = :'author';

\echo ''
\echo '### 1. a member can soft-delete their own account'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.profiles set deleted_at = now() where id = :'deleted';
reset role;
select test.check(
  '0042.1 deleted_at set on the own row',
  (select (deleted_at is not null)::text from public.profiles where id = :'deleted'),
  'true');

\echo ''
\echo '### 2. a soft-deleted, otherwise-verified member cannot post a case'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0042.2 deleted member cannot post a case',
  $$insert into public.cases (author_id, title, short_caption)
    values ('22222222-2222-2222-2222-222222222222', 'Should fail', 'x')$$);

\echo ''
\echo '### 3. a soft-deleted member cannot react, comment, or follow either'
select test.expect_error(
  '0042.3a deleted member cannot react',
  $$insert into public.reactions (case_id, user_id, type)
    values ('99999999-6666-6666-6666-666666666666',
            '22222222-2222-2222-2222-222222222222', 'save')$$);
select test.expect_error(
  '0042.3b deleted member cannot comment',
  $$insert into public.comments (case_id, user_id, body)
    values ('99999999-6666-6666-6666-666666666666',
            '22222222-2222-2222-2222-222222222222', 'nope')$$);
select test.expect_error(
  '0042.3c deleted member cannot follow',
  $$insert into public.follows (follower_id, followee_id)
    values ('22222222-2222-2222-2222-222222222222',
            '11111111-1111-1111-1111-111111111111')$$);
reset role;

\echo ''
\echo '### 4. restoring (clearing deleted_at) restores every write'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.profiles set deleted_at = null where id = :'deleted';
insert into public.reactions (case_id, user_id, type) values (:'kase', :'deleted', 'save');
reset role;
select test.check(
  '0042.4 reaction recorded once restored',
  (select count(*)::text from public.reactions where case_id=:'kase' and user_id=:'deleted'),
  '1');

\echo ''
\echo '### 5. a member cannot set deleted_at on someone elses row'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.profiles set deleted_at = now() where id = :'author';
reset role;
select test.check(
  '0042.5 the authors row is unaffected',
  (select (deleted_at is null)::text from public.profiles where id = :'author'),
  'true');

reset role;
delete from public.reactions where case_id = :'kase';
delete from public.comments where case_id = :'kase';
delete from public.follows where follower_id = :'deleted' and followee_id = :'author';
delete from public.cases where id = :'kase';
update public.profiles set deleted_at = null where id in (:'author', :'deleted');
