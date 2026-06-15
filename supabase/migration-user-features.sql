-- Long-term memory enhancements + AI preferences (personality, tutor, voice)
-- Run in Supabase SQL editor after existing migrations.

alter table public.user_memory
  add column if not exists category text not null default 'general',
  add column if not exists source text not null default 'auto',
  add column if not exists importance integer not null default 1;

create index if not exists user_memory_user_id_created_at_idx
  on public.user_memory (user_id, created_at desc);

create table if not exists public.user_ai_preferences (
  user_id uuid primary key,
  personality_mode text not null default 'normal',
  tutor_mode_enabled boolean not null default false,
  tutor_level text not null default 'intermediate',
  voice_output_enabled boolean not null default false,
  voice_auto_send boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.user_ai_preferences enable row level security;

drop policy if exists "Users can read own ai preferences" on public.user_ai_preferences;
create policy "Users can read own ai preferences"
on public.user_ai_preferences for select
using (auth.uid() = user_id);

drop policy if exists "Service role can manage ai preferences" on public.user_ai_preferences;
create policy "Service role can manage ai preferences"
on public.user_ai_preferences for all
using (true)
with check (true);

drop policy if exists "Users can delete own memory" on public.user_memory;
create policy "Users can delete own memory"
on public.user_memory for delete
using (auth.uid() = user_id);

drop policy if exists "Service role can insert memory" on public.user_memory;
drop policy if exists "Service role can manage memory rows" on public.user_memory;
create policy "Service role can manage memory rows"
on public.user_memory for all
using (true)
with check (true);
