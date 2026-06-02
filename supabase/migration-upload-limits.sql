-- Tageslimit fuer Bild-Uploads an mekkz AI (einmal im Supabase SQL Editor ausfuehren)

alter table public.user_plans
add column if not exists uploads_today integer not null default 0;
