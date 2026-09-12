-- Adds the fourth and last category on /notifications (Replies / Interests /
-- Followers / Shares): a repost. Same shape as notify_new_reaction (0040),
-- but 'repost' isn't one of the three clinical values that function accepts,
-- so this is a dedicated function rather than an extra case in that one.
--
-- Guarded (create or replace) so this is safe to paste twice.

create or replace function public.notify_new_repost(p_case_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_case public.cases;
begin
  select * into v_case from public.cases where id = p_case_id;

  if v_case.id is null or v_case.author_id is null or v_case.author_id = v_actor then
    return null;
  end if;

  insert into public.notifications (user_id, type, body, case_id, actor_id)
  values (v_case.author_id, 'new_repost', 'reposted your case', p_case_id, v_actor);

  return v_case.author_id;
end;
$$;

revoke all on function public.notify_new_repost(uuid) from public;
grant execute on function public.notify_new_repost(uuid) to authenticated;
