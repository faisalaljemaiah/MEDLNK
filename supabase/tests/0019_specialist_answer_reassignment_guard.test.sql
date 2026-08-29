-- Security tests for 0019_specialist_answer_reassignment_guard.sql.
--
-- The property: a specialist cannot move their existing answer onto a
-- request outside their own specialty by updating request_id directly —
-- the same match the insert policy enforces has to hold on update too.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author  '11111111-1111-1111-1111-111111111111'
\set cardio  '88888888-8888-8888-8888-888888888888'
\set kase    '33333333-3333-3333-3333-333333333333'
\set req_cardio '99999999-9999-9999-9999-999999999993'
\set req_nephro '99999999-9999-9999-9999-999999999994'
\set answer  '99999999-9999-9999-9999-999999999995'

reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'cardio','cardio@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='reassignauthor', verified=true,
  suspended_at=null where id=:'author';
-- Deliberately only a cardiologist, not a nephrologist.
update public.profiles set full_name='Cardio', handle='reassigncardio', verified=true,
  suspended_at=null, specialty='Cardiology' where id=:'cardio';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'Two ACE inhibitors', 'caption')
  on conflict (id) do nothing;

-- Broad delete by case, not by this file's own ids: 0012's test leaves a
-- Cardiology request on this same seeded case id, which would otherwise
-- collide with specialist_requests_one_per_specialty below.
delete from public.specialist_answers
  where request_id in (select id from public.specialist_requests where case_id = :'kase');
delete from public.specialist_requests where case_id = :'kase';
insert into public.specialist_requests (id, case_id, requester_id, specialty, question)
values
  (:'req_cardio', :'kase', :'author', 'Cardiology', 'Rhythm question'),
  (:'req_nephro', :'kase', :'author', 'Nephrology', 'AKI question');

\echo ''
\echo '### 1. the cardiologist answers the cardiology request'
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
insert into public.specialist_answers (id, request_id, responder_id, body)
values (:'answer', :'req_cardio', :'cardio', 'Initial answer');
select test.check(
  '0019.1 answer recorded on the matching request',
  (select request_id::text from public.specialist_answers where id=:'answer'),
  :'req_cardio');

\echo ''
\echo '### 2. the cardiologist can still edit the body of their own answer'
update public.specialist_answers set body = 'Revised answer' where id = :'answer';
reset role;
select test.check(
  '0019.2 body edit still works',
  (select body from public.specialist_answers where id=:'answer'),
  'Revised answer');

\echo ''
\echo '### 3. the cardiologist must not be able to move it onto the nephrology request'
set role authenticated;
set request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
select test.expect_error(
  '0019.3 cannot reassign to a request outside their specialty',
  $$update public.specialist_answers set request_id = '99999999-9999-9999-9999-999999999994'
    where id = '99999999-9999-9999-9999-999999999995'$$);

\echo ''
\echo '### 4. ...and it still points at the cardiology request'
reset role;
select test.check(
  '0019.4 reassignment attempt left the answer where it was',
  (select request_id::text from public.specialist_answers where id=:'answer'),
  :'req_cardio');

reset role;
delete from public.specialist_answers
  where request_id in (select id from public.specialist_requests where case_id = :'kase');
delete from public.specialist_requests where case_id = :'kase';
