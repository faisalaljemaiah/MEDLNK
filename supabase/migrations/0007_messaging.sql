-- Direct messages between two verified clinicians.
--
-- A conversation is the unordered pair of participants, stored in canonical
-- (user_a < user_b) order so there's exactly one row per pair — callers must
-- insert with the smaller uuid as user_a.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index conversations_user_a_idx on public.conversations (user_a);
create index conversations_user_b_idx on public.conversations (user_b);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages (conversation_id, created_at);

-- RLS ------------------------------------------------------------------------
-- Same shape as reactions/comments/follows in 0004_rls.sql: readable only by
-- participants, writable only by a verified participant, reusing
-- public.is_verified() defined there.

alter table public.conversations enable row level security;

create policy "conversations_select_participant"
  on public.conversations for select
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "conversations_insert_verified_participant"
  on public.conversations for insert
  with check (
    (auth.uid() = user_a or auth.uid() = user_b)
    and public.is_verified()
  );

alter table public.messages enable row level security;

create policy "messages_select_participant"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "messages_insert_verified_participant"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and public.is_verified()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );
