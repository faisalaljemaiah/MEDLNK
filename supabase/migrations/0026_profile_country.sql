-- A clinician's own country (set once on their profile, not picked per
-- post) — the authoritative source for which country a case is tagged
-- with in the Global Case Exchange, so nobody can tag a case as
-- originating somewhere they don't actually practice. Same two-letter
-- shape as cases.country_code (0017).

alter table public.profiles add column if not exists country_code text;

alter table public.profiles drop constraint if exists profiles_country_code_check;
alter table public.profiles add constraint profiles_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');
