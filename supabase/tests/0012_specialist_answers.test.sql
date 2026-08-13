-- Security + behaviour tests for 0012_specialist_answers.sql.
--
-- The property that matters: the specialty badge on an answer has to be true.
-- It is enforced at write time, so a non-specialist must not be able to insert
-- an answer no matter what the UI showed them.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author  '11111111-1111-1111-1111-111111111111'
\set reader  '22222222-2222-2222-2222-222222222222'
\set cardio  '88888888-8888-8888-8888-888888888888'
\set kase    '33333333-3333-3333-3333-333333333333'
\set req     '99999999-9999-9999-9999-999999999991'

reset role;
insert into auth.users (id, email) values
  (:'author','author@x.com'), (:'reader','reader@x.com'), (:'cardio','cardio@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true,
  suspended_at=null, specialty='General Medicine' where id=:'author';
-- Deliberately not a cardiologist.
update public.profiles set full_name='Reader', handle='reader', verified=true,
  suspended_at=null, specialty='Dermatology' where id=:'reader';
-- Odd casing and padding on purpose: profiles.specialty is free text, so the
-- match has to be lower(trim(...)) or half the specialists never see the ask.
update public.profiles set full_name='Cardio', handle='cardio', verified=true,
  suspended_at=null, specialty='  cardiology ' where id=:'cardio';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'Two ACE inhibitors', 'caption')
  on conflict (id) do nothing;

delete from public.specialist_requests where case_id = :'kase';
delete from public.notifications where type like 'specialist%';

\echo ''
\echo '### 1. a verified member asks for a specialty opinion'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.specialist_requests (id, case_id, requester_id, specialty, question)
values (:'req', :'kase', :'author', 'Cardiology', 'Is dual RAAS ever justified here?');
select test.check(
  '0012.1 request filed',
  (select count(*)::text from public.specialist_requests where case_id = :'kase'),
  '1');

\echo ''
\echo '### 2. a second ask for the same specialty is a duplicate'
-- Odd casing and padding on purpose: the unique index is on
-- lower(trim(specialty)), so this must collide with 'Cardiology' above.
select test.expect_error(
  '0012.2 one ask per specialty per case',
  $$insert into public.specialist_requests (case_id, requester_id, specialty, question)
    values ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '  CARDIOLOGY  ', 'same thing again')$$);

\echo ''
\echo '### 3. asking on somebody elses behalf must be refused'
select test.expect_error(
  '0012.3 can only ask as yourself',
  $$insert into public.specialist_requests (case_id, requester_id, specialty, question)
    values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'Nephrology', 'not my account')$$);

\echo ''
\echo '### 4. a dermatologist must not be able to answer a cardiology ask'
-- The assertion the specialty badge depends on. If this ever passes, every
-- badge in the UI becomes "this person clicked the button".
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0012.4 specialty match enforced at write time',
  $$insert into public.specialist_answers (request_id, responder_id, body)
    values ('99999999-9999-9999-9999-999999999991', '22222222-2222-2222-2222-222222222222', 'I reckon it is fine.')$$);

\echo ''
\echo '### 5. the cardiologist can answer, despite an untidy specialty string'
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'cardio', 'No — stop one and recheck the potassium.');
select test.check(
  '0012.5 matching specialist can answer',
  (select count(*)::text from public.specialist_answers where request_id = :'req'),
  '1');

\echo ''
\echo '### 6. the same specialist answering twice must be rejected'
select test.expect_error(
  '0012.6 one answer per specialist per request',
  $$insert into public.specialist_answers (request_id, responder_id, body)
    values ('99999999-9999-9999-9999-999999999991', '88888888-8888-8888-8888-888888888888', 'Actually, also...')$$);

\echo ''
\echo '### 7. answering as somebody else must be refused'
select test.expect_error(
  '0012.7 can only answer as yourself',
  $$insert into public.specialist_answers (request_id, responder_id, body)
    values ('99999999-9999-9999-9999-999999999991', '22222222-2222-2222-2222-222222222222', 'signed, someone else')$$);

\echo ''
\echo '### 8. the request fan-out reaches only that specialty'
reset role;
delete from public.notifications where type like 'specialist%';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_specialist_request(:'req');
reset role;
select test.check(
  '0012.8 request fan-out reaches only that specialty',
  (select coalesce(string_agg(p.handle, ',' order by p.handle), '')
     from public.notifications n join public.profiles p on p.id = n.user_id
     where n.type = 'specialist_request'),
  'cardio');

\echo ''
\echo '### 9. answer fan-out: requester and case followers, never the answerer'
-- The follower is set up here rather than relied on from another test file, so
-- this asserts the follower branch instead of accidentally exercising it.
delete from public.notifications where type like 'specialist%';
insert into public.case_followers (case_id, user_id) values (:'kase', :'reader')
  on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
select public.fan_out_specialist_answer(:'req');
reset role;
select test.check(
  '0012.9 answer fan-out reaches the requester and the follower',
  (select coalesce(string_agg(p.handle, ',' order by p.handle), '')
     from public.notifications n join public.profiles p on p.id = n.user_id
     where n.type = 'specialist_answer'),
  'author,reader');
select test.check(
  '0012.9 the answerer is never notified of their own answer',
  (select count(*)::text from public.notifications
     where type = 'specialist_answer' and user_id = :'cardio'),
  '0');
select test.check(
  '0012.9 the requester is notified exactly once, not once per branch',
  (select count(*)::text from public.notifications
     where type = 'specialist_answer' and user_id = :'author'),
  '1');

\echo ''
\echo '### 10. a suspended cardiologist cannot answer'
reset role;
delete from public.specialist_answers where request_id = :'req';
update public.profiles set suspended_at = now() where id = :'cardio';
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
select test.expect_error(
  '0012.10 suspension blocks answering',
  $$insert into public.specialist_answers (request_id, responder_id, body)
    values ('99999999-9999-9999-9999-999999999991', '88888888-8888-8888-8888-888888888888', 'still here?')$$);

\echo ''
\echo '### 11. ...and is not notified of new asks either'
reset role;
delete from public.notifications where type like 'specialist%';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_specialist_request(:'req');
reset role;
select test.check(
  '0012.11 suspended specialists are not notified',
  (select count(*)::text from public.notifications where type = 'specialist_request'),
  '0');

\echo ''
\echo '### 12. a closed request cannot be answered'
update public.profiles set suspended_at = null where id = :'cardio';
update public.specialist_requests set status = 'closed' where id = :'req';
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
select test.expect_error(
  '0012.12 closed requests reject new answers',
  $$insert into public.specialist_answers (request_id, responder_id, body)
    values ('99999999-9999-9999-9999-999999999991', '88888888-8888-8888-8888-888888888888', 'too late')$$);

reset role;
update public.specialist_requests set status = 'open' where id = :'req';
