create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Neuer Chat',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_message text not null,
  assistant_message text not null,
  user_image text,
  image_name text,
  assistant_image text,
  user_image_category text,
  assistant_image_category text,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  memory text not null,
  created_at timestamp with time zone default now()
);

alter table public.conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.user_memory enable row level security;

create policy "Users can read own conversations"
on public.conversations for select
using (auth.uid() = user_id);

create policy "Service role can manage conversations"
on public.conversations for all
using (true)
with check (true);

create policy "Users can read own chats"
on public.chat_messages for select
using (auth.uid() = user_id);

create policy "Service role can insert chats"
on public.chat_messages for insert
with check (true);

create policy "Users can read own memory"
on public.user_memory for select
using (auth.uid() = user_id);

create policy "Service role can insert memory"
on public.user_memory for insert
with check (true);

-- Developer API keys (siehe auch migration-developer-api.sql)
create table if not exists public.developer_api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null default 'Default',
  key_prefix text not null,
  key_hash text not null unique,
  requests_today integer not null default 0,
  usage_day date not null default current_date,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists developer_api_keys_user_id_idx
  on public.developer_api_keys (user_id);

create index if not exists developer_api_keys_key_hash_idx
  on public.developer_api_keys (key_hash);

alter table public.developer_api_keys enable row level security;

drop policy if exists "Users can read own api keys" on public.developer_api_keys;
create policy "Users can read own api keys"
on public.developer_api_keys for select
using (auth.uid() = user_id);

drop policy if exists "Service role manages api keys" on public.developer_api_keys;
create policy "Service role manages api keys"
on public.developer_api_keys for all
using (true)
with check (true);
