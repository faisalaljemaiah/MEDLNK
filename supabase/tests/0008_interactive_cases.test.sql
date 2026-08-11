-- Security + behaviour tests for 0008_interactive_cases.sql.
--
-- Roles matter here and leak between statements in one session, so every
-- section states the role and JWT subject it runs as. A section that forgets
-- silently runs as the previous actor and RLS quietly no-ops the write, which
-- looks like a pass.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set kase   '33333333-3333-3333-3333-333333333333'
\set quest  '44444444-4444-4444-4444-444444444444'
\set optA   '55555555-5555-5555-5555-555555555551'
\set optB   '55555555-5555-5555-5555-555555555552'

-- Fixtures, as superuser.
reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'reader','reader@x.com');
update public.profiles set full_name='Author', handle='author', verified=true where id=:'author';
update public.profiles set full_name='Reader', handle='reader', verified=true where id=:'reader';

insert into public.cases (id, author_id, title, short_caption, case_type)
values (:'kase', :'author', 'Two ACE inhibitors', 'caption', 'what_would_you_do');
insert into public.case_questions (id, case_id, prompt, explanation, allow_change)
values (:'quest', :'kase', 'What would you do?', 'Duplicate RAAS blockade.', false);
insert into public.case_options (id, question_id, body, is_correct, position) values
  (:'optA', :'quest', 'Stop lisinopril', false, 0),
  (:'optB', :'quest', 'Contact the prescriber', true, 1);

\echo ''
\echo '### 1. browser role reading is_correct -- MUST FAIL'
set role authenticated;
select is_correct from public.case_options limit 1;

\echo ''
\echo '### 2. browser role reading safe columns -- MUST SUCCEED'
select body, position from public.case_options order by position;

\echo ''
\echo '### 3. select * (what a naive client does) -- MUST FAIL'
select * from public.case_options limit 1;

\echo ''
\echo '### 4. reader submits WRONG answer -- expect f'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.submit_case_answer(:'quest', :'optA') as was_correct;

\echo ''
\echo '### 5. re-answer while allow_change=false -- must stay f, still 1 row'
select public.submit_case_answer(:'quest', :'optB') as was_correct;
reset role;
select count(*) as attempt_rows from public.case_attempts;

\echo ''
\echo '### 6. option borrowed from another question -- MUST ERROR'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.submit_case_answer(:'quest', '00000000-0000-0000-0000-000000000000');

\echo ''
\echo '### 7. author enables revision (as the AUTHOR, or RLS no-ops it)'
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.case_questions set allow_change = true where id = :'quest';
select allow_change from public.case_questions where id = :'quest';

\echo ''
\echo '### 8. re-answer with allow_change=true -- expect t, still 1 row'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.submit_case_answer(:'quest', :'optB') as was_correct;
reset role;
select count(*) as attempt_rows from public.case_attempts;

\echo ''
\echo '### 9. distribution readable by anon -- expect 0 then 1'
set role anon;
select o.body, d.votes
from public.case_answer_distribution('44444444-4444-4444-4444-444444444444') d
join public.case_options o on o.id = d.option_id
order by o.position;

\echo ''
\echo '### 10. author cannot see the readers attempt row -- expect 0'
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select count(*) as visible_to_author from public.case_attempts;

\echo ''
\echo '### 11. non-author publishing an update -- MUST FAIL'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.case_updates (case_id, author_id, stage, body)
values (:'kase', :'reader', 'Update', 'sneaky');

\echo ''
\echo '### 12. follower gets notified when the author publishes'
reset role;
insert into public.case_followers (case_id, user_id) values (:'kase', :'reader');
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.case_updates (case_id, author_id, stage, body)
values (:'kase', :'author', 'Outcome', 'Prescriber contacted.');
select public.fan_out_case_update(:'kase', 'case_update', 'New update');
reset role;
select user_id, type, body from public.notifications;

\echo ''
\echo '### 13. fan-out only reaches followers of THAT case -- expect 1 row total'
select count(*) as total_notifications from public.notifications;

\echo ''
\echo '### 14. clients cannot mint notifications -- MUST FAIL'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.notifications (user_id, type, body)
values (:'reader', 'fake', 'spam');
reset role;
