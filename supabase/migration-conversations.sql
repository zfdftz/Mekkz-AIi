-- mekkz AI: Gespeicherte Chats aktivieren
-- In Supabase SQL Editor einfuegen und RUN klicken

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Neuer Chat',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.chat_messages
add column if not exists conversation_id uuid references public.conversations(id) on delete cascade;

alter table public.conversations enable row level security;

drop policy if exists "Users can read own conversations" on public.conversations;
create policy "Users can read own conversations"
on public.conversations for select
using (auth.uid() = user_id);

drop policy if exists "Service role can manage conversations" on public.conversations;
create policy "Service role can manage conversations"
on public.conversations for all
using (true)
with check (true);
