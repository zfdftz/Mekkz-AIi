-- Bild-Support fuer Chat-Nachrichten (einmal in Supabase SQL Editor ausfuehren)

alter table public.chat_messages
add column if not exists user_image text;

alter table public.chat_messages
add column if not exists image_name text;
