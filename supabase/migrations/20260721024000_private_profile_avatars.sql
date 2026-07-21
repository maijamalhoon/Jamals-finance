-- Preserve the existing avatar bytes and move only their delivery metadata from
-- permanent public URLs to the authenticated same-origin endpoint.
with legacy_avatars as (
  select
    id,
    split_part(
      raw_user_meta_data->>'avatar_url',
      '/storage/v1/object/public/avatars/',
      2
    ) as avatar_path
  from auth.users
  where coalesce(raw_user_meta_data->>'avatar_url', '')
    like '%/storage/v1/object/public/avatars/%'
), safe_avatars as (
  select id, avatar_path
  from legacy_avatars
  where avatar_path ~ '^[0-9a-fA-F-]{36}/profile\.(jpg|jpeg|png|webp)$'
)
update auth.users as users
set raw_user_meta_data = jsonb_set(
  jsonb_set(
    coalesce(users.raw_user_meta_data, '{}'::jsonb),
    '{avatar_path}',
    to_jsonb(safe_avatars.avatar_path),
    true
  ),
  '{avatar_url}',
  to_jsonb('/api/profile/avatar?path=' || safe_avatars.avatar_path),
  true
)
from safe_avatars
where users.id = safe_avatars.id;

update storage.buckets
set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']::text[]
where id = 'avatars';

drop policy if exists "Users can read their own avatar" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

create policy "Users can read their own private avatar"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'avatars'
  and name ~ (
    '^' || (select auth.uid())::text || '/profile\.(jpg|jpeg|png|webp)$'
  )
);

create policy "Users can upload their own private avatar"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and name ~ (
    '^' || (select auth.uid())::text || '/profile\.(jpg|jpeg|png|webp)$'
  )
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "Users can update their own private avatar"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and name ~ (
    '^' || (select auth.uid())::text || '/profile\.(jpg|jpeg|png|webp)$'
  )
)
with check (
  bucket_id = 'avatars'
  and name ~ (
    '^' || (select auth.uid())::text || '/profile\.(jpg|jpeg|png|webp)$'
  )
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

create policy "Users can delete their own private avatar"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and name ~ (
    '^' || (select auth.uid())::text || '/profile\.(jpg|jpeg|png|webp)$'
  )
);
