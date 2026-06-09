-- Abo-Ende und geplanter Planwechsel (einmal im Supabase SQL Editor ausfuehren)

alter table public.user_plans
  add column if not exists stripe_period_end timestamptz,
  add column if not exists scheduled_plan text,
  add column if not exists scheduled_plan_at timestamptz;

create index if not exists user_plans_scheduled_plan_at_idx
  on public.user_plans (scheduled_plan_at)
  where scheduled_plan_at is not null;
