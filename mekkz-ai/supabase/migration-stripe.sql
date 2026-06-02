-- Stripe-Abo-Felder (einmal im Supabase SQL Editor ausfuehren)

alter table public.user_plans
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_subscription_status text;

create index if not exists user_plans_stripe_customer_id_idx
  on public.user_plans (stripe_customer_id);

create index if not exists user_plans_stripe_subscription_id_idx
  on public.user_plans (stripe_subscription_id);
