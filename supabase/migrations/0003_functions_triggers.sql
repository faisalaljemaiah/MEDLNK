-- Auto-create a pending profile row when someone signs up via Supabase Auth.
-- The profile-setup screen fills in the rest (full_name, handle, license, etc.)
-- with a plain UPDATE, which the RLS policy on profiles allows for owners.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Case numbers like CASE-0912, assigned on insert.
create sequence public.case_number_seq start 1;

create function public.set_case_number()
returns trigger
language plpgsql
as $$
begin
  if new.case_number is null then
    new.case_number := 'CASE-' || lpad(nextval('public.case_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger cases_set_case_number
  before insert on public.cases
  for each row execute function public.set_case_number();

-- Guard against users granting themselves verification or admin rights via a
-- plain profile UPDATE. Only an existing admin (checked via profiles.is_admin)
-- or a service-role context (no JWT -> auth.uid() is null, e.g. the seed
-- script or an admin Edge Function) may change these fields.
create function public.guard_profile_privilege_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.verified is distinct from old.verified
      or new.verification_status is distinct from old.verification_status
      or new.is_admin is distinct from old.is_admin)
    and auth.uid() is not null
    and not exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.is_admin
    )
  then
    new.verified := old.verified;
    new.verification_status := old.verification_status;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privilege_fields
  before update on public.profiles
  for each row execute function public.guard_profile_privilege_fields();
