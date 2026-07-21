revoke all privileges on table public.crypto_assets from anon, authenticated;
grant select on table public.crypto_assets to anon, authenticated;
grant all privileges on table public.crypto_assets to service_role;

revoke all privileges on function public.set_crypto_assets_updated_at()
  from public, anon, authenticated;
grant execute on function public.set_crypto_assets_updated_at()
  to service_role, postgres;
