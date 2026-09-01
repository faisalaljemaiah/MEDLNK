-- Behaviour tests for 0031_communities.sql.
-- The property: anyone (signed out included) can read communities and
-- membership rows (bubble counts must work signed out); only a verified
-- member with at least 100 followers can create a community; membership rows
-- are only ever writable by the member themselves.
\set ON_ERROR_STOP off

\set a '44444444-4444-4444-4444-444444444444'
\set b '55555555-5555-5555-5555-555555555555'
\set c '66666666-6666-6666-6666-666666666666'

reset role;
insert into auth.users (id, email) values
  (:'a','commA@x.com'), (:'b','commB@x.com'), (:'c','commC@x.com')
  on conflict (id) do nothing;
update public.profiles set handle='commfewfollow', verified=true, suspended_at=null where id=:'a';
update public.profiles set handle='commmanyfollow', verified=true, suspended_at=null where id=:'b';
update public.profiles set handle='commviewer', verified=true, suspended_at=null where id=:'c';
delete from public.community_members where user_id in (:'a',:'b',:'c');
delete from public.communities where creator_id in (:'a',:'b',:'c');
delete from public.follows where followee_id in (:'a',:'b');

\echo ''
\echo '### 1. has_min_followers is a plain count threshold'
select test.check(
  '0031.1a zero followers does not clear a threshold of 1',
  (select public.has_min_followers(1)::text),
  'false');

set role authenticated;
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
insert into public.follows (follower_id, followee_id) values (:'c', :'b');
reset role;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select test.check(
  '0031.1b one follower clears a threshold of 1',
  (select public.has_min_followers(1)::text),
  'true');
select test.check(
  '0031.1c one follower does not clear a threshold of 2',
  (select public.has_min_followers(2)::text),
  'false');
reset role;

\echo ''
\echo '### 1d. give b 99 more followers (100 total) so it clears the real create-community gate below'
reset role;
do $$
declare i int; uid uuid;
begin
  for i in 1..99 loop
    uid := ('00000000-0000-0000-0000-' || lpad(i::text, 12, '0'))::uuid;
    insert into auth.users (id, email) values (uid, 'commbulk'||i||'@x.com') on conflict (id) do nothing;
    insert into public.follows (follower_id, followee_id) values (uid, '55555555-5555-5555-5555-555555555555') on conflict do nothing;
  end loop;
end $$;

\echo ''
\echo '### 2. a verified member under the follower threshold cannot create a community'
set role authenticated;
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
select test.expect_error(
  '0031.2 under-threshold creator is rejected',
  $$insert into public.communities (name, slug, scope, creator_id) values
    ('Too Small', 'too-small', 'global', '44444444-4444-4444-4444-444444444444')$$);
reset role;

\echo ''
\echo '### 3. a global community needs no country_code, a country one requires it'
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select test.expect_error(
  '0031.3a country scope without a country_code is rejected',
  $$insert into public.communities (name, slug, scope, creator_id) values
    ('Bad Scope', 'bad-scope', 'country', '55555555-5555-5555-5555-555555555555')$$);
reset role;

\echo ''
\echo '### 4. anyone, signed out included, can read communities and membership rows'
set role authenticated;
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
insert into public.communities (name, slug, scope, creator_id) values
  ('Cardiology Worldwide', 'cardiology-worldwide', 'global', :'b');
insert into public.community_members (community_id, user_id, status)
  select id, :'b', 'joined' from public.communities where slug = 'cardiology-worldwide';
reset role;
set role anon;
select test.check(
  '0031.4a anon can read the community row',
  (select count(*)::text from public.communities where slug = 'cardiology-worldwide'),
  '1');
select test.check(
  '0031.4b anon can read (aggregate) the membership row',
  (select count(*)::text from public.community_members cm
     join public.communities c on c.id = cm.community_id
   where c.slug = 'cardiology-worldwide'),
  '1');
reset role;

\echo ''
\echo '### 5. a member can save then upgrade to joined, and only for themselves'
set role authenticated;
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
insert into public.community_members (community_id, user_id, status)
  select id, :'c', 'saved' from public.communities where slug = 'cardiology-worldwide';
update public.community_members set status = 'joined'
  where user_id = :'c'
    and community_id = (select id from public.communities where slug = 'cardiology-worldwide');
reset role;
select test.check(
  '0031.5 status transitioned in place, not a new row',
  (select status from public.community_members cm
     join public.communities c on c.id = cm.community_id
   where c.slug = 'cardiology-worldwide' and cm.user_id = :'c'),
  'joined');

\echo ''
\echo '### 6. a member cannot write another member''s row'
-- RLS filters rows the USING clause excludes rather than raising, so an
-- attempted cross-user delete quietly affects zero rows instead of erroring
-- (same shape as 0029.8's "blocked side cannot delete the block row") — the
-- assertion is that b's row is still there afterwards, not that the
-- statement itself throws.
set role authenticated;
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
delete from public.community_members
  where user_id = '55555555-5555-5555-5555-555555555555';
reset role;
select test.check(
  '0031.6 cannot delete someone else''s membership row',
  (select count(*)::text from public.community_members cm
     join public.communities c on c.id = cm.community_id
   where c.slug = 'cardiology-worldwide' and cm.user_id = :'b'),
  '1');

reset role;
delete from public.community_members where user_id in (:'a',:'b',:'c');
delete from public.communities where creator_id in (:'a',:'b',:'c');
delete from public.follows where followee_id in (:'a',:'b');
