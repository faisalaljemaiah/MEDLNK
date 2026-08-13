-- Behaviour tests for 0017_reasoning_trees_and_exchange.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set post   'dddddddd-0000-0000-0000-00000000000a'
\set other  'dddddddd-0000-0000-0000-00000000000b'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'reader','reader@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='author', verified=true, suspended_at=null where id=:'author';
update public.profiles set handle='reader', verified=true, suspended_at=null where id=:'reader';

delete from public.cases where id in (:'post', :'other');
insert into public.cases (id, author_id, title, short_caption, case_type, country_code) values
  (:'post',  :'author', 'Chest pain', 'caption', 'clinical_case', 'US'),
  (:'other', :'reader', 'Another case', 'caption', 'clinical_case', null);

\echo ''
\echo '### 1. country_code accepts a two-letter code'
select test.check(
  '0017.1 country_code stored',
  (select country_code from public.cases where id = :'post'),
  'US');

\echo ''
\echo '### 2. country_code rejects the wrong shape'
select test.expect_error(
  '0017.2 country_code must be two letters',
  $$update public.cases set country_code = 'USA' where id = 'dddddddd-0000-0000-0000-00000000000a'$$);

\echo ''
\echo '### 3. the case author can add a root node'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.case_reasoning_nodes (case_id, node_type, label)
values (:'post', 'finding', 'Elevated troponin');
select test.check(
  '0017.3 root node recorded',
  (select count(*)::text from public.case_reasoning_nodes where case_id = :'post'),
  '1');

\echo ''
\echo '### 4. the author can attach a child to their own node'
insert into public.case_reasoning_nodes (case_id, parent_id, node_type, label)
select :'post', id, 'differential', 'ACS considered'
from public.case_reasoning_nodes where case_id = :'post' and parent_id is null;
select test.check(
  '0017.4 child recorded under its parent',
  (select count(*)::text from public.case_reasoning_nodes
     where case_id = :'post' and parent_id is not null),
  '1');

\echo ''
\echo '### 5. a parent from a different case must be rejected'
reset role;
insert into public.case_reasoning_nodes (case_id, node_type, label)
values (:'other', 'finding', 'Unrelated finding');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0017.5 a node cannot borrow a parent from another case',
  $$insert into public.case_reasoning_nodes (case_id, parent_id, node_type, label)
    select 'dddddddd-0000-0000-0000-00000000000a', id, 'action', 'borrowed parent'
    from public.case_reasoning_nodes where case_id = 'dddddddd-0000-0000-0000-00000000000b'$$);

\echo ''
\echo '### 6. a non-author must not be able to add to someone elses tree'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0017.6 only the case author writes to its tree',
  $$insert into public.case_reasoning_nodes (case_id, node_type, label)
    values ('dddddddd-0000-0000-0000-00000000000a', 'conclusion', 'not my case')$$);

\echo ''
\echo '### 7. a suspended author must not be able to add a node'
reset role;
update public.profiles set suspended_at = now() where id = :'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.expect_error(
  '0017.7 suspension blocks adding a node',
  $$insert into public.case_reasoning_nodes (case_id, node_type, label)
    values ('dddddddd-0000-0000-0000-00000000000a', 'conclusion', 'while suspended')$$);
reset role;
update public.profiles set suspended_at = null where id = :'author';

\echo ''
\echo '### 8. deleting a case cascades its reasoning tree'
delete from public.cases where id = :'post';
select test.check(
  '0017.8 tree removed with its case',
  (select count(*)::text from public.case_reasoning_nodes where case_id = 'dddddddd-0000-0000-0000-00000000000a'),
  '0');

reset role;
delete from public.cases where id in (:'post', :'other');
