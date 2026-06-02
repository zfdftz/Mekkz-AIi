-- KI-generierte Bilder in Chat-Nachrichten speichern (einmal in Supabase SQL Editor ausfuehren)

alter table public.chat_messages
add column if not exists assistant_image text;
