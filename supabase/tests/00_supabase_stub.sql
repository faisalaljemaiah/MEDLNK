create extension if not exists pgcrypto;
create schema if not exists auth;
create schema if not exists storage;

-- Mirrors the columns the project's handle_new_user() trigger reads.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);

-- Matches Supabase's own definition: PostgREST 9+ exposes the whole claim set
-- as the `request.jwt.claims` JSON GUC, while older versions (and a plain
-- `set request.jwt.claim.sub` in a psql test) use the per-claim form. Reading
-- only one of them makes every JWT-authenticated call look signed-out.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid
$$;

create table if not exists storage.buckets (
  id text primary key, name text, public boolean,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
create or replace function storage.foldername(name text) returns text[]
language sql immutable as $$ select string_to_array(name, '/') $$;

do $$ begin
  create role anon; exception when duplicate_object then null;
end $$;
do $$ begin
  create role authenticated; exception when duplicate_object then null;
end $$;

-- Supabase grants these roles broad access to the public schema and relies on
-- RLS for row filtering. Replicating that here is what makes the column-level
-- revoke on case_options.is_correct a real test rather than a no-op.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public
  grant all on tables to anon, authenticated;
alter default privileges in schema public
  grant all on sequences to anon, authenticated;
alter default privileges in schema public
  grant execute on functions to anon, authenticated;
