-- Behaviour tests for 0038_active_gate_for_interactions.sql.
-- The property: reacting, commenting, and following only need an active
-- account (onboarded, not suspended) — not full license verification —
-- while posting a case still requires public.is_verified().
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set pending '22222222-2222-2222-2222-222222222222'
\set suspended '33333333-3333-3333-3333-333333333333'
\set incomplete '44444444-4444-4444-4444-444444444444'
\set other '55555555-5555-5555-5555-555555555555'
\set kase '66666666-6666-6666-6666-666666666666'

reset role;
insert into auth.users (id, email) values
  (:'author','a0038@x.com'), (:'pending','p0038@x.com'),
  (:'suspended','s0038@x.com'), (:'incomplete','i0038@x.com'),
  (:'other','o0038@x.com')
  on conflict (id) do nothing;

update public.profiles set full_name='Author0038', handle='author0038', verified=true, suspended_at=null where id=:'author';
-- Onboarded, but never approved — exactly the state most new members sit in
-- once license verification is back on.
update public.profiles set full_name='Pending0038', handle='pending0038', verified=false, verification_status='pending', suspended_at=null where id=:'pending';
update public.profiles set full_name='Suspended0038', handle='suspended0038', verified=false, suspended_at=now() where id=:'suspended';
-- Never finished onboarding: handle stays null.
update public.profiles set full_name=null, handle=null, verified=false, suspended_at=null where id=:'incomplete';
update public.profiles set full_name='Other0038', handle='other0038', verified=false, verification_status='pending', suspended_at=null where id=:'other';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'Test case for 0038', 'caption')
  on conflict (id) do nothing;

delete from public.reactions where case_id = :'kase';
delete from public.comments where case_id = :'kase';
delete from public.follows where follower_id in (:'pending',:'suspended',:'incomplete') and followee_id = :'author';

\echo ''
\echo '### 1. a pending (unverified, active) member can react'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.reactions (case_id, user_id, type) values (:'kase', :'pending', 'save');
select test.check(
  '0038.1 pending member reaction recorded',
  (select count(*)::text from public.reactions where case_id=:'kase' and user_id=:'pending'),
  '1');

\echo ''
\echo '### 2. a pending (unverified, active) member can comment'
insert into public.comments (case_id, user_id, body) values (:'kase', :'pending', 'A reply');
select test.check(
  '0038.2 pending member comment recorded',
  (select count(*)::text from public.comments where case_id=:'kase' and user_id=:'pending'),
  '1');

\echo ''
\echo '### 3. a pending (unverified, active) member can follow'
insert into public.follows (follower_id, followee_id) values (:'pending', :'author');
select test.check(
  '0038.3 pending member follow recorded',
  (select count(*)::text from public.follows where follower_id=:'pending' and followee_id=:'author'),
  '1');

\echo ''
\echo '### 4. ...but a pending member still cannot post a case (unchanged)'
select test.expect_error(
  '0038.4 pending member cannot post a case',
  $$insert into public.cases (author_id, title, short_caption)
    values ('22222222-2222-2222-2222-222222222222', 'Should fail', 'x')$$);

\echo ''
\echo '### 5. a suspended member cannot react, comment, or follow'
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select test.expect_error(
  '0038.5a suspended member cannot react',
  $$insert into public.reactions (case_id, user_id, type)
    values ('66666666-6666-6666-6666-666666666666',
            '33333333-3333-3333-3333-333333333333', 'save')$$);
select test.expect_error(
  '0038.5b suspended member cannot comment',
  $$insert into public.comments (case_id, user_id, body)
    values ('66666666-6666-6666-6666-666666666666',
            '33333333-3333-3333-3333-333333333333', 'nope')$$);
select test.expect_error(
  '0038.5c suspended member cannot follow',
  $$insert into public.follows (follower_id, followee_id)
    values ('33333333-3333-3333-3333-333333333333',
            '11111111-1111-1111-1111-111111111111')$$);

\echo ''
\echo '### 6. an incomplete signup (no handle yet) cannot react, comment, or follow'
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select test.expect_error(
  '0038.6a incomplete signup cannot react',
  $$insert into public.reactions (case_id, user_id, type)
    values ('66666666-6666-6666-6666-666666666666',
            '44444444-4444-4444-4444-444444444444', 'save')$$);
select test.expect_error(
  '0038.6b incomplete signup cannot comment',
  $$insert into public.comments (case_id, user_id, body)
    values ('66666666-6666-6666-6666-666666666666',
            '44444444-4444-4444-4444-444444444444', 'nope')$$);
select test.expect_error(
  '0038.6c incomplete signup cannot follow',
  $$insert into public.follows (follower_id, followee_id)
    values ('44444444-4444-4444-4444-444444444444',
            '11111111-1111-1111-1111-111111111111')$$);

\echo ''
\echo '### 7. a blocked pair still cannot follow, even though both are active (0029 preserved)'
reset role;
delete from public.user_blocks where blocker_id=:'author' and blocked_id=:'other';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.user_blocks (blocker_id, blocked_id) values (:'author', :'other');
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select test.expect_error(
  '0038.7 blocked side cannot follow despite being active',
  $$insert into public.follows (follower_id, followee_id)
    values ('55555555-5555-5555-5555-555555555555',
            '11111111-1111-1111-1111-111111111111')$$);

reset role;
delete from public.user_blocks where blocker_id=:'author' and blocked_id=:'other';
delete from public.reactions where case_id = :'kase';
delete from public.comments where case_id = :'kase';
delete from public.follows where follower_id in (:'pending',:'suspended',:'incomplete',:'other') and followee_id = :'author';
