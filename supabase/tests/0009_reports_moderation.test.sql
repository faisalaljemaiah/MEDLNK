-- Security + behaviour tests for 0009_reports_moderation.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
--
-- Assertions go through test.check / test.expect_error (00_assert.sql) so a
-- wrong answer fails the run instead of printing quietly. This file is the
-- reason that exists: "### 12. a member cannot un-remove their own case"
-- printed the wrong value for a whole session and nobody read it, which is how
-- a real moderation bypass shipped (fixed in 0013).
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
\echo '### 1. a signed-in member can report a case'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.reports (reporter_id, case_id, reason, details)
values (:'reader', :'kase', 'patient_privacy', 'Looks like a real MRN in the presentation.');
select test.check(
  '0009.1 report filed',
  (select count(*)::text from public.reports),
  '1');

\echo ''
\echo '### 2. the same person reporting the same case again is a duplicate'
select test.expect_error(
  '0009.2 one open report per person per target',
  $$insert into public.reports (reporter_id, case_id, reason)
    values ('22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333', 'spam')$$);

\echo ''
\echo '### 3. reporting on somebody elses behalf must be refused'
select test.expect_error(
  '0009.3 can only report as yourself',
  $$insert into public.reports (reporter_id, case_id, reason)
    values ('11111111-1111-1111-1111-111111111111',
            '33333333-3333-3333-3333-333333333333', 'spam')$$);

\echo ''
\echo '### 4. a report with two targets must be refused'
select test.expect_error(
  '0009.4 single-target check holds',
  $$insert into public.reports (reporter_id, case_id, reported_profile_id, reason)
    values ('22222222-2222-2222-2222-222222222222',
            '33333333-3333-3333-3333-333333333333',
            '11111111-1111-1111-1111-111111111111', 'spam')$$);

\echo ''
\echo '### 5. the reported author cannot see the report'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0009.5 reports are not enumerable by the reported',
  (select count(*)::text from public.reports),
  '0');

\echo ''
\echo '### 6. an admin sees the queue'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
select test.check(
  '0009.6 admin sees the queue',
  (select count(*)::text from public.reports),
  '1');

\echo ''
\echo '### 7. a non-admin cannot resolve a report'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update public.reports set status='approved' where case_id=:'kase';
select test.check(
  '0009.7 non-admin resolution no-ops',
  (select status from public.reports where case_id=:'kase' limit 1),
  'pending');

\echo ''
\echo '### 8. an admin removes the case and resolves the report'
set request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
update public.cases set moderation_status='removed' where id=:'kase';
update public.reports set status='removed', reviewed_by=:'admin', reviewed_at=now()
  where case_id=:'kase';
insert into public.moderation_events (actor_id, action, target_kind, target_id, note)
values (:'admin', 'case_removed', 'case', :'kase', 'Contained a patient identifier.');
select test.check(
  '0009.8 admin removal takes effect',
  (select moderation_status from public.cases where id=:'kase'),
  'removed');

\echo ''
\echo '### 9. a removed case is invisible to the public'
set role anon;
set request.jwt.claim.sub = '';
select test.check(
  '0009.9 removed case hidden from anon',
  (select count(*)::text from public.cases where id=:'kase'),
  '0');

\echo ''
\echo '### 10. ...and to other members'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0009.10 removed case hidden from other members',
  (select count(*)::text from public.cases where id=:'kase'),
  '0');

\echo ''
\echo '### 11. ...but its author still sees it (a takedown is not silent)'
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0009.11 author still sees their removed case',
  (select count(*)::text from public.cases where id=:'kase'),
  '1');

\echo ''
\echo '### 12. a member cannot un-remove their own case'
-- The one that got away. Guarded by a trigger since 0013; before that this
-- update succeeded and the assertion below printed "visible" unread.
select test.expect_error(
  '0009.12 author cannot reverse a takedown',
  $$update public.cases set moderation_status='visible'
    where id='33333333-3333-3333-3333-333333333333'$$);
reset role;
select test.check(
  '0009.12 case is still removed',
  (select moderation_status from public.cases where id=:'kase'),
  'removed');

\echo ''
\echo '### 13. suspension blocks writes through is_verified()'
reset role;
update public.profiles set suspended_at=now(), suspended_reason='Repeated privacy breaches'
  where id=:'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0009.13 suspended member is not verified',
  public.is_verified()::text,
  'false');
select test.expect_error(
  '0009.13 suspended member cannot post',
  $$insert into public.cases (author_id, title, short_caption)
    values ('11111111-1111-1111-1111-111111111111',
            'Post while suspended', 'should not land')$$);

\echo ''
\echo '### 14. lifting the suspension restores writes'
reset role;
update public.profiles set suspended_at=null where id=:'author';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0009.14 lifted suspension restores verification',
  public.is_verified()::text,
  'true');

\echo ''
\echo '### 15. the audit log is admin-only and append-only'
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select test.check(
  '0009.15 audit log invisible to members',
  (select count(*)::text from public.moderation_events),
  '0');
-- No update policy at all, so this updates zero rows rather than raising.
-- Checking the note is unchanged is the assertion that would catch one being
-- added by accident.
update public.moderation_events set note='rewritten';
reset role;
select test.check(
  '0009.15 audit log entries cannot be rewritten',
  (select note from public.moderation_events where target_id=:'kase' limit 1),
  'Contained a patient identifier.');
reset role;
