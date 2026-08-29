-- Contact/support channel: required for app-store review under Apple's
-- guideline 1.2 (an app with user-generated content must publish contact
-- information so objectionable content can be reported and removed) and as
-- a general support channel. Deliberately not gated behind sign-in or
-- verification — the reports table (0009) already covers a signed-in
-- member reporting a specific case/comment/profile; this is the broader
-- "anyone, including a signed-out visitor, can reach the team" channel
-- Apple's guideline actually asks for.

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  reason text not null check (reason in ('report_content', 'account', 'general', 'other')),
  message text not null,
  -- Set by the app when the sender happens to be signed in, purely so an
  -- admin has more context — never required, never trusted for identity.
  reporter_id uuid references public.profiles (id) on delete set null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.support_messages enable row level security;

-- Anyone can submit, signed in or not — reporter_id can only ever be your
-- own id or left null, so nobody can submit "as" someone else.
create policy "support_messages_insert_anyone"
  on public.support_messages for insert
  with check (reporter_id is null or reporter_id = auth.uid());

create policy "support_messages_select_admin"
  on public.support_messages for select
  using (public.is_admin());

create policy "support_messages_update_admin"
  on public.support_messages for update
  using (public.is_admin());
