-- Bild-Kategorien speichern (einmal in Supabase SQL Editor ausfuehren)

alter table public.chat_messages
add column if not exists user_image_category text;

alter table public.chat_messages
add column if not exists assistant_image_category text;
