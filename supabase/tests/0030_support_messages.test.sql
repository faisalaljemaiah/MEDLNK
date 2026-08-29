-- Behaviour tests for 0030_support_messages.sql.
\set ON_ERROR_STOP off

\set member '11111111-1111-1111-1111-111111111111'
\set other  '22222222-2222-2222-2222-222222222222'
\set admin  '77777777-7777-7777-7777-777777777777'

reset role;
insert into auth.users (id, email) values
  (:'member','member@x.com'), (:'other','other@x.com'), (:'admin','admin@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='supportmember', is_admin=false where id=:'member';
update public.profiles set handle='supportother', is_admin=false where id=:'other';
update public.profiles set handle='supportadmin', is_admin=true where id=:'admin';
delete from public.support_messages where email in ('anon@x.com','member@x.com','spoof@x.com');

\echo ''
\echo '### 1. a signed-out visitor can submit (reporter_id left null)'
set role anon;
insert into public.support_messages (email, reason, message) values
  ('anon@x.com', 'report_content', 'This case has identifying info.');

\echo ''
\echo '### 2. a signed-in member can submit as themselves'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.support_messages (email, reason, message, reporter_id) values
  ('member@x.com', 'general', 'Question about verification', :'member');

\echo ''
\echo '### 3. a member cannot submit claiming to be someone else'
select test.expect_error(
  '0030.3 cannot spoof another reporter_id',
  $$insert into public.support_messages (email, reason, message, reporter_id) values
    ('spoof@x.com', 'other', 'x', '22222222-2222-2222-2222-222222222222')$$);

\echo ''
\echo '### 4. an ordinary member cannot read messages'
select test.check(
  '0030.4 member sees none',
  (select count(*)::text from public.support_messages),
  '0');

\echo ''
\echo '### 5. an admin can read and resolve them'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select test.check(
  '0030.5 admin sees both messages',
  (select count(*)::text from public.support_messages where email in ('anon@x.com','member@x.com')),
  '2');
update public.support_messages set resolved = true where email = 'anon@x.com';
select test.check(
  '0030.6 admin can mark resolved',
  (select resolved::text from public.support_messages where email = 'anon@x.com'),
  'true');

reset role;
delete from public.support_messages where email in ('anon@x.com','member@x.com','spoof@x.com');
