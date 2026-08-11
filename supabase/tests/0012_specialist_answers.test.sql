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
\echo '### 1. a verified member asks for a specialty opinion -- expect 1 row'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.specialist_requests (id, case_id, requester_id, specialty, question)
values (:'req', :'kase', :'author', 'Cardiology', 'Is dual RAAS ever justified here?');
select count(*) as requests from public.specialist_requests where case_id = :'kase';

\echo ''
\echo '### 2. a second ask for the same specialty -- MUST FAIL (one per case)'
insert into public.specialist_requests (case_id, requester_id, specialty, question)
values (:'kase', :'author', '  CARDIOLOGY  ', 'same thing again');

\echo ''
\echo '### 3. asking on somebody elses behalf -- MUST FAIL (RLS)'
insert into public.specialist_requests (case_id, requester_id, specialty, question)
values (:'kase', :'reader', 'Nephrology', 'not my account');

\echo ''
\echo '### 4. a dermatologist answering a cardiology ask -- MUST FAIL'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'reader', 'I reckon it is fine.');

\echo ''
\echo '### 5. the cardiologist answering -- expect 1 row'
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'cardio', 'No — stop one and recheck the potassium.');
select count(*) as answers from public.specialist_answers where request_id = :'req';

\echo ''
\echo '### 6. the same specialist answering twice -- MUST FAIL (one per request)'
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'cardio', 'Actually, also...');

\echo ''
\echo '### 7. answering as somebody else -- MUST FAIL'
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'reader', 'signed, someone else');

\echo ''
\echo '### 8. request fan-out reaches only that specialty -- expect cardio only'
reset role;
delete from public.notifications where type like 'specialist%';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_specialist_request(:'req');
reset role;
select p.handle, n.type from public.notifications n
  join public.profiles p on p.id = n.user_id
  where n.type = 'specialist_request' order by p.handle;

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
\echo '-- expect author (asked) and reader (follows); NOT cardio (answered)'
select p.handle from public.notifications n
  join public.profiles p on p.id = n.user_id
  where n.type = 'specialist_answer' order by p.handle;
\echo '-- expect 0: the answerer must never be notified of their own answer'
select count(*) as answerer_notified from public.notifications
  where type = 'specialist_answer' and user_id = :'cardio';
\echo '-- expect 1: the requester is notified exactly once, not once per branch'
select count(*) as requester_notified from public.notifications
  where type = 'specialist_answer' and user_id = :'author';

\echo ''
\echo '### 10. a suspended cardiologist answering -- MUST FAIL'
reset role;
delete from public.specialist_answers where request_id = :'req';
update public.profiles set suspended_at = now() where id = :'cardio';
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'cardio', 'still here?');

\echo ''
\echo '### 11. ...and a suspended specialist is not notified of new asks -- expect 0'
reset role;
delete from public.notifications where type like 'specialist%';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_specialist_request(:'req');
reset role;
select count(*) as notified from public.notifications where type = 'specialist_request';

\echo ''
\echo '### 12. answering a closed request -- MUST FAIL'
update public.profiles set suspended_at = null where id = :'cardio';
update public.specialist_requests set status = 'closed' where id = :'req';
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
insert into public.specialist_answers (request_id, responder_id, body)
values (:'req', :'cardio', 'too late');

reset role;
update public.specialist_requests set status = 'open' where id = :'req';
