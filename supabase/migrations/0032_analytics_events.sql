-- Product-analytics events: what features get used and how far a visitor
-- gets through onboarding before dropping off. Same anonymous-insert /
-- admin-only-read shape as support_messages (0030) — tracking has to work
-- for a signed-out visitor mid-onboarding (welcome, signup, login screens),
-- and the raw event log is only ever meant for the admin dashboard, never
-- surfaced to the member it's about.

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  -- Free text, not an enum: the fixed allow-list of real event names lives
  -- in application code (src/lib/analytics-events.ts) so adding a new one
  -- doesn't need a migration — same tradeoff cases.tags already makes.
  event_type text not null,
  user_id uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

-- Anyone can log an event, signed in or not — user_id can only ever be your
-- own id or left null, so nobody can log an event "as" someone else.
create policy "analytics_events_insert_anyone"
  on public.analytics_events for insert
  with check (user_id is null or user_id = auth.uid());

create policy "analytics_events_select_admin"
  on public.analytics_events for select
  using (public.is_admin());
