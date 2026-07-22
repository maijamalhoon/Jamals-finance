-- Normalize investment type aliases before constraints are checked so current
-- and legacy clients can safely use singular or plural market labels.
create or replace function public.normalize_investment_type_aliases()
returns trigger
language plpgsql
set search_path to 'pg_catalog'
as $$
declare
  normalized_type text;
begin
  normalized_type := btrim(
    regexp_replace(lower(btrim(coalesce(new.type, ''))), '[^a-z0-9]+', '_', 'g'),
    '_'
  );

  new.type := case
    when normalized_type in ('stock', 'stocks', 'equity', 'equities', 'share', 'shares')
      then 'stocks'
    when normalized_type in ('forex', 'fx', 'currency', 'currencies')
      then 'forex'
    when normalized_type in (
      'crypto',
      'cryptocurrency',
      'cryptocurrencies',
      'coin',
      'coins'
    )
      then 'crypto'
    when normalized_type in ('saving', 'savings')
      then 'savings'
    when normalized_type in ('realestate', 'real_estate')
      then 'real_estate'
    when normalized_type = 'other' or normalized_type = ''
      then 'other'
    else normalized_type
  end;

  return new;
end;
$$;

revoke all on function public.normalize_investment_type_aliases()
from public, anon, authenticated;

drop trigger if exists normalize_investment_type_aliases
on public.investments;

create trigger normalize_investment_type_aliases
before insert or update of type
on public.investments
for each row
execute function public.normalize_investment_type_aliases();

-- Re-run existing values through the canonicalizer before replacing the check.
update public.investments
set type = type;

alter table public.investments
  drop constraint if exists investments_type_check;

alter table public.investments
  add constraint investments_type_check
  check (
    type = any (
      array[
        'crypto'::text,
        'stocks'::text,
        'forex'::text,
        'savings'::text,
        'real_estate'::text,
        'other'::text
      ]
    )
  );
