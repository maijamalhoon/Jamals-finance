create or replace function public.preserve_custom_profile_avatar()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  metadata jsonb;
  previous_metadata jsonb;
  avatar_path text;
begin
  metadata := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  previous_metadata := case
    when tg_op = 'UPDATE' then coalesce(old.raw_user_meta_data, '{}'::jsonb)
    else '{}'::jsonb
  end;

  if metadata ? 'avatar_path' then
    avatar_path := nullif(btrim(metadata->>'avatar_path'), '');
  elsif tg_op = 'UPDATE' then
    avatar_path := nullif(btrim(previous_metadata->>'avatar_path'), '');
  end if;

  if avatar_path is not null
     and avatar_path ~ ('^' || new.id::text || '/profile\.(jpg|jpeg|png|webp)$') then
    metadata := jsonb_set(
      metadata,
      '{avatar_path}',
      to_jsonb(avatar_path),
      true
    );
    metadata := jsonb_set(
      metadata,
      '{avatar_url}',
      to_jsonb('/api/profile/avatar?path=' || avatar_path),
      true
    );
  end if;

  new.raw_user_meta_data := metadata;
  return new;
end;
$$;

drop trigger if exists preserve_custom_profile_avatar on auth.users;
create trigger preserve_custom_profile_avatar
before insert or update of raw_user_meta_data on auth.users
for each row
execute function public.preserve_custom_profile_avatar();

update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{avatar_url}',
  to_jsonb(
    '/api/profile/avatar?path=' || (raw_user_meta_data->>'avatar_path')
  ),
  true
)
where (raw_user_meta_data->>'avatar_path')
  ~ ('^' || id::text || '/profile\.(jpg|jpeg|png|webp)$');
