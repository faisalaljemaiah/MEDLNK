-- Permanent signup blocklist for admin-removed accounts. Distinct from
-- profiles.suspended_at, which is a reversible restriction on an account
-- that still exists — "Remove & Block" in the admin Users directory
-- deletes the underlying auth user entirely (same cascade
-- deleteAccountAction uses), so there's nothing left to suspend; this
-- table is what stops that email from just signing up again.

create table public.blocked_emails (
  email text primary key,
  reason text,
  blocked_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.blocked_emails enable row level security;

-- Admin-only end to end: signUpAction checks this table with the
-- service-role client (bypassing RLS, same as notifyApplicant's lookup in
-- src/app/actions/admin.ts), so there is no anonymous-readable policy here
-- that could let a signup form behave differently based on whether an
-- email is blocklisted.
create policy "blocked_emails_select_admin"
  on public.blocked_emails for select
  using (public.is_admin());

create policy "blocked_emails_insert_admin"
  on public.blocked_emails for insert
  with check (public.is_admin());

create policy "blocked_emails_delete_admin"
  on public.blocked_emails for delete
  using (public.is_admin());
