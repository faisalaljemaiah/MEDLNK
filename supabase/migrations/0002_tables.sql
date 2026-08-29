-- Core schema for Asyashare v1 (text + image cases only).
-- Video/live fields are intentionally NOT included yet — when that lands later,
-- add a nullable `media_type` / separate `media` table rather than overloading
-- `media_url`, so existing rows keep working unmodified.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  handle text unique,
  role text,
  city text,
  specialty text,
  verified boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'approved', 'rejected')),
  license_number text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  short_caption text not null,
  full_body jsonb not null default '{}'::jsonb,
  -- full_body shape: { presentation: text, tricky: text, actions: text[], lesson: text }
  tags text[] not null default '{}',
  media_url text,
  specialty text,
  case_number text unique,
  created_at timestamptz not null default now()
);

create index cases_author_id_idx on public.cases (author_id);
create index cases_created_at_idx on public.cases (created_at desc);
create index cases_tags_idx on public.cases using gin (tags);
create index cases_specialty_idx on public.cases (specialty);

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('like', 'repost', 'save')),
  created_at timestamptz not null default now(),
  unique (case_id, user_id, type)
);

create index reactions_case_id_idx on public.reactions (case_id);
create index reactions_user_id_idx on public.reactions (user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index comments_case_id_idx on public.comments (case_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  followee_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create table public.ai_recaps (
  case_id uuid primary key references public.cases (id) on delete cascade,
  summary text,
  similar_case_ids text[] not null default '{}',
  generated_at timestamptz not null default now()
);
