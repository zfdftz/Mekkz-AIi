-- Sprache pro Nutzer (einmal im Supabase SQL Editor ausfuehren)

create table if not exists public.user_preferences (
  user_id uuid primary key,
  preferred_language text not null default 'en',
  language_auto_detected boolean not null default false,
  updated_at timestamp with time zone default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read own preferences" on public.user_preferences;
create policy "Users can read own preferences"
on public.user_preferences for select
using (auth.uid() = user_id);

drop policy if exists "Service role manages preferences" on public.user_preferences;
create policy "Service role manages preferences"
on public.user_preferences for all
using (true)
with check (true);
