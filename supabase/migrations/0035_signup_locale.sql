-- Captures the signup-time language choice (Arabic/English) into the new
-- profile row, the same raw_user_meta_data pass-through handle_new_user
-- (0003) already uses for full_name. Anything other than 'en'/'ar' —
-- including a signup that predates this and carries no 'locale' key at all —
-- falls back to the column's own default ('en', 0021) rather than being
-- trusted straight into a column with a CHECK constraint, since
-- raw_user_meta_data is client-supplied.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, locale)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case
      when new.raw_user_meta_data ->> 'locale' in ('en', 'ar')
        then new.raw_user_meta_data ->> 'locale'
      else 'en'
    end
  );
  return new;
end;
$$;
