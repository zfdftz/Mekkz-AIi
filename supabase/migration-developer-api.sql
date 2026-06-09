-- MEKKZ AI Developer API Keys (einmal im Supabase SQL Editor ausführen)

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
