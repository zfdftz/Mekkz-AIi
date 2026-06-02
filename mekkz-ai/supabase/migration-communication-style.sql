-- Kommunikationsstil pro Nutzer (einmal im Supabase SQL Editor ausfuehren)

create table if not exists public.user_communication_style (
  user_id uuid primary key,
  enabled boolean not null default true,
  style_prompt text not null default '',
  frequent_terms jsonb not null default '[]'::jsonb,
  analyzed_messages integer not null default 0,
  updated_at timestamp with time zone default now()
);

alter table public.user_communication_style enable row level security;

drop policy if exists "Users can read own communication style" on public.user_communication_style;
create policy "Users can read own communication style"
on public.user_communication_style for select
using (auth.uid() = user_id);

drop policy if exists "Service role manages communication style" on public.user_communication_style;
create policy "Service role manages communication style"
on public.user_communication_style for all
using (true)
with check (true);
