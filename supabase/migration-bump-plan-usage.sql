-- Atomares Hochzaehlen der Tageslimits (einmal im Supabase SQL Editor ausfuehren)

create or replace function public.bump_user_plan_usage(p_user_id uuid, p_field text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('Europe/Berlin', now()))::date;
  r public.user_plans%rowtype;
begin
  if p_field not in ('images', 'uploads') then
    raise exception 'invalid usage field: %', p_field;
  end if;

  insert into public.user_plans (user_id, plan, images_today, uploads_today, usage_day)
  values (p_user_id, 'free', 0, 0, v_today)
  on conflict (user_id) do nothing;

  update public.user_plans
  set
    images_today = case when usage_day is distinct from v_today then 0 else images_today end,
    uploads_today = case when usage_day is distinct from v_today then 0 else uploads_today end,
    usage_day = v_today,
    updated_at = now()
  where user_id = p_user_id;

  if p_field = 'images' then
    update public.user_plans
    set images_today = images_today + 1, usage_day = v_today, updated_at = now()
    where user_id = p_user_id
    returning * into r;
  else
    update public.user_plans
    set uploads_today = uploads_today + 1, usage_day = v_today, updated_at = now()
    where user_id = p_user_id
    returning * into r;
  end if;

  return jsonb_build_object(
    'plan', r.plan,
    'images_today', r.images_today,
    'uploads_today', r.uploads_today,
    'usage_day', r.usage_day
  );
end;
$$;

grant execute on function public.bump_user_plan_usage(uuid, text) to service_role;
