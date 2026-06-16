-- Stripe + Abo-Felder (einmal im Supabase SQL Editor ausfuehren)
-- Enthält migration-stripe.sql + migration-stripe-period.sql

alter table public.user_plans
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_period_end timestamptz,
  add column if not exists scheduled_plan text,
  add column if not exists scheduled_plan_at timestamptz;

create index if not exists user_plans_stripe_customer_id_idx
  on public.user_plans (stripe_customer_id);

create index if not exists user_plans_stripe_subscription_id_idx
  on public.user_plans (stripe_subscription_id);

create index if not exists user_plans_scheduled_plan_at_idx
  on public.user_plans (scheduled_plan_at)
  where scheduled_plan_at is not null;
