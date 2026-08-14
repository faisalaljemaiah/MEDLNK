-- Language preference (Settings). A member's own display-language choice,
-- same shape as student_mode (0014): a preference, not a role, not gated on
-- verification, and not privileged — profiles_update_own (0004) already lets
-- a member set it, no guard needed the way 0018's five columns needed one.

alter table public.profiles add column if not exists locale text not null default 'en'
  check (locale in ('en', 'ar'));
