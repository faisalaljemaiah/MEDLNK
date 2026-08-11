-- Security + behaviour tests for 0008_interactive_cases.sql.
--
-- Roles matter here and leak between statements in one session, so every
-- section states the role and JWT subject it runs as. A section that forgets
-- silently runs as the previous actor and RLS quietly no-ops the write, which
-- looks like a pass.
--
-- Assertions go through test.check / test.expect_error (00_assert.sql) so a
-- wrong answer fails the run instead of printing quietly.
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
\echo '### 1. the browser role must not be able to read is_correct'
set role authenticated;
select test.expect_error(
  '0008.1 is_correct hidden from clients',
  'select is_correct from public.case_options limit 1');

\echo ''
\echo '### 2. ...but the safe columns are readable'
select test.check(
  '0008.2 option bodies readable',
  (select string_agg(body, ' | ' order by position) from public.case_options),
  'Stop lisinopril | Contact the prescriber');

\echo ''
\echo '### 3. select * -- what a naive client does -- must be refused'
-- The whole point of the column grant: a client that asks for everything gets
-- nothing, rather than quietly getting the answer.
select test.expect_error(
  '0008.3 select * refused',
  'select * from public.case_options limit 1');

\echo ''
\echo '### 4. reader submits a WRONG answer'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0008.4 wrong answer graded false',
  public.submit_case_answer(:'quest', :'optA')::text,
  'false');

\echo ''
\echo '### 5. re-answering while allow_change=false must not overwrite'
select test.check(
  '0008.5 re-answer returns the stored result',
  public.submit_case_answer(:'quest', :'optB')::text,
  'false');
reset role;
select test.check(
  '0008.5 still one attempt row',
  (select count(*)::text from public.case_attempts),
  '1');

\echo ''
\echo '### 6. an option borrowed from another question must be rejected'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0008.6 option must belong to the question',
  $$select public.submit_case_answer(
      '44444444-4444-4444-4444-444444444444',
      '00000000-0000-0000-0000-000000000000')$$);

\echo ''
\echo '### 7. author enables revision (as the AUTHOR, or RLS no-ops it)'
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.case_questions set allow_change = true where id = :'quest';
select test.check(
  '0008.7 allow_change set by the author',
  (select allow_change::text from public.case_questions where id = :'quest'),
  'true');

\echo ''
\echo '### 8. re-answering with allow_change=true updates in place'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0008.8 revised answer graded true',
  public.submit_case_answer(:'quest', :'optB')::text,
  'true');
reset role;
select test.check(
  '0008.8 still one attempt row',
  (select count(*)::text from public.case_attempts),
  '1');

\echo ''
\echo '### 9. the distribution is readable by anon, and counts correctly'
set role anon;
select test.check(
  '0008.9 distribution aggregates without exposing who',
  (select string_agg(o.body || '=' || d.votes, ' | ' order by o.position)
     from public.case_answer_distribution('44444444-4444-4444-4444-444444444444') d
     join public.case_options o on o.id = d.option_id),
  'Stop lisinopril=0 | Contact the prescriber=1');

\echo ''
\echo '### 10. the author cannot see the readers attempt row'
reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0008.10 attempts are private to their owner',
  (select count(*)::text from public.case_attempts),
  '0');

\echo ''
\echo '### 11. a non-author must not be able to publish an update'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0008.11 only the case author publishes updates',
  $$insert into public.case_updates (case_id, author_id, stage, body)
    values ('33333333-3333-3333-3333-333333333333',
            '22222222-2222-2222-2222-222222222222', 'Update', 'sneaky')$$);

\echo ''
\echo '### 12. a follower is notified when the author publishes'
reset role;
insert into public.case_followers (case_id, user_id) values (:'kase', :'reader')
  on conflict do nothing;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.case_updates (case_id, author_id, stage, body)
values (:'kase', :'author', 'Outcome', 'Prescriber contacted.');
select public.fan_out_case_update(:'kase', 'case_update', 'New update');
reset role;
select test.check(
  '0008.12 the follower is notified',
  (select string_agg(p.handle || ':' || n.type, ',' order by p.handle)
     from public.notifications n join public.profiles p on p.id = n.user_id),
  'reader:case_update');

\echo ''
\echo '### 13. the fan-out reaches followers of THAT case and nobody else'
-- This is the assertion that would have caught the missing case filter: an
-- unscoped fan-out notifies every follower on the platform, and the only
-- visible difference is this count.
select test.check(
  '0008.13 fan-out is scoped to the case',
  (select count(*)::text from public.notifications),
  '1');

\echo ''
\echo '### 14. clients must not be able to mint their own notifications'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.expect_error(
  '0008.14 notifications are server-written only',
  $$insert into public.notifications (user_id, type, body)
    values ('22222222-2222-2222-2222-222222222222', 'fake', 'spam')$$);
reset role;
