-- Abo-Plaene und Bild-Limits (einmal im Supabase SQL Editor ausfuehren)

create table if not exists public.user_plans (
  user_id uuid primary key,
  plan text not null default 'free',
  images_today integer not null default 0,
  uploads_today integer not null default 0,
  usage_day date not null default current_date,
  updated_at timestamp with time zone default now()
);

alter table public.user_plans enable row level security;

drop policy if exists "Users can read own plan" on public.user_plans;
create policy "Users can read own plan"
on public.user_plans for select
using (auth.uid() = user_id);

drop policy if exists "Service role manages plans" on public.user_plans;
create policy "Service role manages plans"
on public.user_plans for all
using (true)
with check (true);
