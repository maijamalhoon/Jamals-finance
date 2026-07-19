drop policy if exists "Users can read their own avatar" on storage.objects;
create policy "Users can read their own avatar"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
