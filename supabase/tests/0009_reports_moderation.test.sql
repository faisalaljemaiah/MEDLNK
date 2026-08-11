-- Security + behaviour tests for 0009_reports_moderation.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set admin  '77777777-7777-7777-7777-777777777777'
\set kase   '33333333-3333-3333-3333-333333333333'

reset role;
insert into auth.users (id, email) values (:'admin', 'admin@x.com');
update public.profiles set full_name='Admin', handle='admin', verified=true, is_admin=true
  where id=:'admin';

\echo ''
\echo '### 1. a signed-in member can report a case -- expect 1 row'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.reports (reporter_id, case_id, reason, details)
values (:'reader', :'kase', 'patient_privacy', 'Looks like a real MRN in the presentation.');
select count(*) as my_reports from public.reports;

\echo ''
\echo '### 2. the same person reporting the same case again -- MUST FAIL (duplicate)'
insert into public.reports (reporter_id, case_id, reason)
values (:'reader', :'kase', 'spam');

\echo ''
\echo '### 3. reporting on someone elses behalf -- MUST FAIL'
insert into public.reports (reporter_id, case_id, reason)
values (:'author', :'kase', 'spam');

\echo ''
\echo '### 4. a report with two targets -- MUST FAIL (single-target check)'
insert into public.reports (reporter_id, case_id, reported_profile_id, reason)
values (:'reader', :'kase', :'author', 'spam');

\echo ''
\echo '### 5. the reported author cannot see the report -- expect 0'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select count(*) as visible_to_reported from public.reports;

\echo ''
\echo '### 6. an admin sees the queue -- expect 1'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select count(*) as visible_to_admin from public.reports;

\echo ''
\echo '### 7. a non-admin cannot resolve a report -- expect 0 rows updated'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.reports set status='approved' where case_id=:'kase';
select status as still from public.reports where case_id=:'kase' limit 1;

\echo ''
\echo '### 8. an admin removes the case and resolves the report'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.cases set moderation_status='removed' where id=:'kase';
update public.reports set status='removed', reviewed_by=:'admin', reviewed_at=now()
  where case_id=:'kase';
insert into public.moderation_events (actor_id, action, target_kind, target_id, note)
values (:'admin', 'case_removed', 'case', :'kase', 'Contained a patient identifier.');
select moderation_status from public.cases where id=:'kase';

\echo ''
\echo '### 9. removed case is invisible to the public -- expect 0'
set role anon;
set request.jwt.claim.sub = '';
select count(*) as visible_to_anon from public.cases where id=:'kase';

\echo ''
\echo '### 10. ...and to other members -- expect 0'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as visible_to_member from public.cases where id=:'kase';

\echo ''
\echo '### 11. ...but its author still sees it (takedown is not silent) -- expect 1'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select count(*) as visible_to_author from public.cases where id=:'kase';

\echo ''
\echo '### 12. a member cannot un-remove their own case -- expect still removed'
update public.cases set moderation_status='visible' where id=:'kase';
reset role;
select moderation_status as after_author_attempt from public.cases where id=:'kase';

\echo ''
\echo '### 13. suspension blocks writes through is_verified() -- MUST FAIL'
reset role;
update public.profiles set suspended_at=now(), suspended_reason='Repeated privacy breaches'
  where id=:'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.is_verified() as still_verified;
insert into public.cases (author_id, title, short_caption)
values (:'author', 'Post while suspended', 'should not land');

\echo ''
\echo '### 14. lifting the suspension restores writes -- expect t'
reset role;
update public.profiles set suspended_at=null where id=:'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.is_verified() as verified_again;

\echo ''
\echo '### 15. audit log is admin-only and append-only -- both MUST FAIL'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select count(*) as events_visible_to_member from public.moderation_events;
update public.moderation_events set note='rewritten';
reset role;
