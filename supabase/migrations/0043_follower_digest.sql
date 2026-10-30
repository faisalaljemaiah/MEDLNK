-- Tracks the last time each profile was sent a "new followers" digest
-- email, so the cron job (api/cron/follower-digest) only picks up follows
-- created since the previous run — robust to the job running late, being
-- skipped once, or its schedule changing, unlike a fixed "last N days"
-- window would be.
alter table public.profiles
  add column if not exists last_follower_digest_at timestamptz;
