alter table public.profiles
  add column if not exists preferred_currency text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_preferred_currency_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_currency_check
      check (preferred_currency is null or preferred_currency in ('PKR', 'USD'));
  end if;
end
$$;

comment on column public.profiles.preferred_currency is
  'Authenticated user account-level default display currency. Null keeps the existing device fallback until the user saves a preference.';
