-- Blocking: required for app-store review under Apple's user-generated-
-- content guideline (1.2) and Google Play's equivalent — an app with
-- user-to-user interaction (comments, messages, follows) must let someone
-- block an abusive user, not just report them. Reporting already exists
-- (0009); this adds the separate, complementary ability to cut another
-- user off entirely.

create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

-- Both participants can see a block exists (not just who placed it) — the
-- blocked side needs this to know why they can no longer message or follow
-- the other person, and the app-side feed/search filtering (getFeedCases,
-- getBlockedPairIds) needs to compute the *mutual* block set for whichever
-- side is viewing.
create policy "user_blocks_select_participant"
  on public.user_blocks for select
  using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "user_blocks_insert_own"
  on public.user_blocks for insert
  with check (auth.uid() = blocker_id);

create policy "user_blocks_delete_own"
  on public.user_blocks for delete
  using (auth.uid() = blocker_id);

-- True if either side has blocked the other. Plain (not security definer)
-- because every call site here checks a pair that includes auth.uid(), so
-- the select policy above already lets the caller see the relevant rows.
create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

-- A block must actually stop contact, not just hide content client-side —
-- enforced at the data layer on both messaging and following.
drop policy if exists "conversations_insert_verified_participant" on public.conversations;
create policy "conversations_insert_verified_participant"
  on public.conversations for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and public.is_verified()
    and not public.is_blocked_pair(user_a, user_b)
  );

drop policy if exists "messages_insert_verified_participant" on public.messages;
create policy "messages_insert_verified_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_verified()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
        and not public.is_blocked_pair(c.user_a, c.user_b)
    )
  );

drop policy if exists "follows_insert_verified_own" on public.follows;
create policy "follows_insert_verified_own"
  on public.follows for insert
  with check (
    auth.uid() = follower_id
    and public.is_verified()
    and not public.is_blocked_pair(follower_id, followee_id)
  );
