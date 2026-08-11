-- Behaviour tests for 0010_clinical_reactions.sql.
--
-- Roles leak between statements in one psql session, so every section states
-- the role and JWT subject it runs as.
\set ON_ERROR_STOP off

\set author '11111111-1111-1111-1111-111111111111'
\set reader '22222222-2222-2222-2222-222222222222'
\set kase   '33333333-3333-3333-3333-333333333333'

-- Fixtures, as superuser. Reuses the ids 0008's tests create; the runner
-- applies every migration to one database, so these rows may already exist.
reset role;
insert into auth.users (id, email) values (:'author','author@x.com'), (:'reader','reader@x.com')
  on conflict (id) do nothing;
update public.profiles set full_name='Author', handle='author', verified=true where id=:'author';
update public.profiles set full_name='Reader', handle='reader', verified=true where id=:'reader';

insert into public.cases (id, author_id, title, short_caption)
values (:'kase', :'author', 'Two ACE inhibitors', 'caption')
  on conflict (id) do nothing;

delete from public.reactions where case_id = :'kase';

\echo ''
\echo '### 1. a verified member records each clinical reaction -- expect 3 rows'
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.reactions (case_id, user_id, type) values
  (:'kase', :'reader', 'interesting'),
  (:'kase', :'reader', 'changed_thinking'),
  (:'kase', :'reader', 'patient_safety');
select count(*) as clinical_reactions from public.reactions where case_id = :'kase';

\echo ''
\echo '### 2. repost and save still work -- expect 5 rows total'
insert into public.reactions (case_id, user_id, type) values
  (:'kase', :'reader', 'repost'),
  (:'kase', :'reader', 'save');
select count(*) as all_reactions from public.reactions where case_id = :'kase';

\echo ''
\echo '### 3. the retired like value -- MUST FAIL (check constraint)'
insert into public.reactions (case_id, user_id, type)
values (:'kase', :'reader', 'like');

\echo ''
\echo '### 4. an invented reaction type -- MUST FAIL'
insert into public.reactions (case_id, user_id, type)
values (:'kase', :'reader', 'thumbs_up');

\echo ''
\echo '### 5. the same reaction twice -- MUST FAIL (unique case/user/type)'
insert into public.reactions (case_id, user_id, type)
values (:'kase', :'reader', 'interesting');

\echo ''
\echo '### 6. reacting as somebody else -- MUST FAIL (RLS)'
insert into public.reactions (case_id, user_id, type)
values (:'kase', :'author', 'interesting');

\echo ''
\echo '### 7. a suspended member reacting -- MUST FAIL (0009 routes through is_verified)'
-- Clear the row first, or this would fail on the unique constraint and read as
-- a pass without RLS ever being consulted.
reset role;
delete from public.reactions
  where case_id = :'kase' and user_id = :'reader' and type = 'changed_thinking';
update public.profiles set suspended_at = now() where id = :'reader';
set role authenticated;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.reactions (case_id, user_id, type)
values (:'kase', :'reader', 'changed_thinking');

reset role;
update public.profiles set suspended_at = null where id = :'reader';
