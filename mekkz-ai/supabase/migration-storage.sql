-- Dauerhafte Chat-Bilder in Supabase Storage (einmal im SQL Editor ausfuehren)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-images',
  'chat-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read chat images" on storage.objects;
create policy "Public read chat images"
on storage.objects for select
using (bucket_id = 'chat-images');

drop policy if exists "Users upload own chat images" on storage.objects;
create policy "Users upload own chat images"
on storage.objects for insert
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own chat images" on storage.objects;
create policy "Users update own chat images"
on storage.objects for update
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own chat images" on storage.objects;
create policy "Users delete own chat images"
on storage.objects for delete
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
