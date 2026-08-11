-- Security + behaviour tests for 0015_safety_alerts.sql.
--
-- This is the one intentionally platform-wide fan-out in the schema, so the
-- assertions are mostly about its edges: who it reaches, who can fire it, what
-- it refuses to fire for, and that firing twice doesn't stack duplicates.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set cardio '88888888-8888-8888-8888-888888888888'
\set alert  'bbbbbbbb-0000-0000-0000-00000000000b'
\set plain  'bbbbbbbb-0000-0000-0000-00000000000c'

reset role;
insert into auth.users (id, email) values
  (:'author','author@x.com'), (:'reader','reader@x.com'), (:'cardio','cardio@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='author', verified=true, suspended_at=null where id=:'author';
update public.profiles set handle='reader', verified=true, suspended_at=null where id=:'reader';
update public.profiles set handle='cardio', verified=true, suspended_at=null where id=:'cardio';

delete from public.cases where id in (:'alert', :'plain');
insert into public.cases (id, author_id, title, short_caption, case_type) values
  (:'alert', :'author', 'Look-alike hydralazine packaging', 'caption', 'safety_alert'),
  (:'plain', :'author', 'An ordinary case',                 'caption', 'clinical_case');
delete from public.notifications where type = 'safety_alert';

-- The expected recipient set is computed, not hardcoded: "everyone verified,
-- unsuspended and not the author" is the actual invariant, and a literal list
-- would just drift as other test files add fixtures.
create or replace view test_expected_alert_recipients as
  select coalesce(string_agg(coalesce(p.handle, p.id::text), ',' order by coalesce(p.handle, p.id::text)), '') as handles
  from public.profiles p
  where p.verified
    and p.suspended_at is null
    and p.id <> '11111111-1111-1111-1111-111111111111';

\echo ''
\echo '### 1. the author broadcasts an alert -- reaches everyone else'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_safety_alert(:'alert');
reset role;
select test.check(
  '0015.1 alert reaches every other verified member',
  (select coalesce(string_agg(coalesce(p.handle, p.id::text), ',' order by coalesce(p.handle, p.id::text)), '')
     from public.notifications n join public.profiles p on p.id = n.user_id
     where n.type = 'safety_alert'),
  (select handles from test_expected_alert_recipients));

\echo ''
\echo '### 2. re-broadcasting must not stack duplicates'
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_safety_alert(:'alert');
reset role;
select test.check(
  '0015.2 re-broadcast is idempotent per recipient',
  (select count(*)::text from public.notifications where type = 'safety_alert'),
  (select count(*)::text from public.profiles p
     where p.verified and p.suspended_at is null
       and p.id <> '11111111-1111-1111-1111-111111111111'));

\echo ''
\echo '### 3. somebody else must not be able to fire the authors alert'
delete from public.notifications where type = 'safety_alert';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.fan_out_safety_alert(:'alert');
reset role;
select test.check(
  '0015.3 only the author can broadcast',
  (select count(*)::text from public.notifications where type = 'safety_alert'),
  '0');

\echo ''
\echo '### 4. it refuses to broadcast a post that is not a safety alert'
-- Otherwise this is a "notify the whole platform" button attached to any post.
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_safety_alert(:'plain');
reset role;
select test.check(
  '0015.4 non-alert posts cannot be broadcast',
  (select count(*)::text from public.notifications where type = 'safety_alert'),
  '0');

\echo ''
\echo '### 5. suspended members are not alerted'
reset role;
update public.profiles set suspended_at = now() where id = :'cardio';
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select public.fan_out_safety_alert(:'alert');
reset role;
select test.check(
  '0015.5 suspended members are skipped',
  (select count(*)::text from public.notifications n
     where n.type = 'safety_alert' and n.user_id = :'cardio'),
  '0');
select test.check(
  '0015.5 ...while everyone else still gets it',
  (select count(*)::text from public.notifications n
     where n.type = 'safety_alert' and n.user_id = :'reader'),
  '1');
update public.profiles set suspended_at = null where id = :'cardio';

\echo ''
\echo '### 6. a member acknowledges an alert'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.safety_alert_acks (case_id, user_id) values (:'alert', :'reader');
select test.check(
  '0015.6 acknowledgement recorded',
  (select count(*)::text from public.safety_alert_acks where case_id = :'alert'),
  '1');

\echo ''
\echo '### 7. acknowledging on somebody elses behalf must be refused'
select test.expect_error(
  '0015.7 can only acknowledge as yourself',
  $$insert into public.safety_alert_acks (case_id, user_id)
    values ('bbbbbbbb-0000-0000-0000-00000000000b',
            '11111111-1111-1111-1111-111111111111')$$);

\echo ''
\echo '### 8. who has read an alert is private'
-- Deliberate: this is the sort of table that becomes a compliance dashboard by
-- accident, and the schema shouldn't make that the path of least resistance.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
select test.check(
  '0015.8 acknowledgements are not visible to the author',
  (select count(*)::text from public.safety_alert_acks),
  '0');

reset role;
drop view if exists test_expected_alert_recipients;
delete from public.cases where id in (:'alert', :'plain');
