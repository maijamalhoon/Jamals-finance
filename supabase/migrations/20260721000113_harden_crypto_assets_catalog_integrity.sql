do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.crypto_assets'::regclass
      and conname = 'crypto_assets_id_not_blank'
  ) then
    alter table public.crypto_assets
      add constraint crypto_assets_id_not_blank check (btrim(id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.crypto_assets'::regclass
      and conname = 'crypto_assets_rank_key'
  ) then
    alter table public.crypto_assets
      add constraint crypto_assets_rank_key unique (rank);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.crypto_assets'::regclass
      and conname = 'crypto_assets_logo_url_http'
  ) then
    alter table public.crypto_assets
      add constraint crypto_assets_logo_url_http
      check (logo_url ~ '^https?://');
  end if;
end
$$;
