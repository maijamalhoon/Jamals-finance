create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
select array[
  'team.view','team.manage','notifications.view','notifications.manage',
  'accounting.view','accounting.manage','banking.view','banking.manage','tax.view','tax.manage',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.can_view_business_banking(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1
  from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager','viewer')
      or '*' = any(membership.permissions)
      or 'banking.view' = any(membership.permissions)
      or 'banking.manage' = any(membership.permissions)
      or 'accounting.view' = any(membership.permissions)
      or 'accounting.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_manage_business_banking(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1
  from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin','accountant')
      or '*' = any(membership.permissions)
      or 'banking.manage' = any(membership.permissions)
      or 'accounting.manage' = any(membership.permissions)
    )
);
$$;

revoke all on function private.can_view_business_banking(uuid) from public;
revoke all on function private.can_manage_business_banking(uuid) from public;
grant execute on function private.can_view_business_banking(uuid) to authenticated;
grant execute on function private.can_manage_business_banking(uuid) to authenticated;

create unique index if not exists business_journal_lines_business_id_id_uidx
  on public.business_journal_lines (business_id, id);

create table if not exists public.business_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ledger_account_id uuid not null,
  name text not null,
  institution_name text,
  account_kind text not null default 'bank',
  account_number_masked text,
  currency text not null,
  reconciliation_start_date date not null default current_date,
  opening_balance_transaction numeric(24,6) not null default 0,
  opening_balance_base numeric(24,6) not null default 0,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_bank_accounts_business_ledger_fkey
    foreign key (business_id, ledger_account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict,
  constraint business_bank_accounts_business_id_id_key unique (business_id, id),
  constraint business_bank_accounts_business_ledger_key unique (business_id, ledger_account_id),
  constraint business_bank_accounts_name_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint business_bank_accounts_institution_check
    check (institution_name is null or char_length(btrim(institution_name)) between 2 and 120),
  constraint business_bank_accounts_kind_check
    check (account_kind in ('bank','cash','mobile_wallet','clearing')),
  constraint business_bank_accounts_number_check
    check (account_number_masked is null or char_length(btrim(account_number_masked)) <= 40),
  constraint business_bank_accounts_currency_check
    check (currency ~ '^[A-Z]{3}$')
);

create table if not exists public.business_bank_statement_imports (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bank_account_id uuid not null,
  file_name text not null,
  file_hash text not null,
  period_start date not null,
  period_end date not null,
  currency text not null,
  opening_balance_transaction numeric(24,6) not null,
  closing_balance_transaction numeric(24,6) not null,
  opening_balance_base numeric(24,6) not null,
  closing_balance_base numeric(24,6) not null,
  line_count integer not null default 0,
  status text not null default 'draft',
  imported_by uuid references auth.users(id) on delete set null,
  reconciled_by uuid references auth.users(id) on delete set null,
  reconciled_at timestamptz,
  voided_by uuid references auth.users(id) on delete set null,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_bank_imports_account_fkey
    foreign key (business_id, bank_account_id)
    references public.business_bank_accounts(business_id, id)
    on delete restrict,
  constraint business_bank_imports_business_id_id_key unique (business_id, id),
  constraint business_bank_imports_file_key unique (bank_account_id, file_hash),
  constraint business_bank_imports_file_name_check
    check (char_length(btrim(file_name)) between 1 and 255),
  constraint business_bank_imports_file_hash_check
    check (file_hash ~ '^[a-f0-9]{64}$'),
  constraint business_bank_imports_period_check
    check (period_end >= period_start),
  constraint business_bank_imports_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  constraint business_bank_imports_count_check
    check (line_count between 0 and 5000),
  constraint business_bank_imports_status_check
    check (status in ('draft','reconciled','void')),
  constraint business_bank_imports_void_reason_check
    check (void_reason is null or char_length(btrim(void_reason)) <= 500)
);

create table if not exists public.business_bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  import_id uuid not null,
  bank_account_id uuid not null,
  line_number integer not null,
  transaction_date date not null,
  posted_date date,
  description text not null,
  reference text,
  external_id text,
  amount_transaction numeric(24,6) not null,
  exchange_rate_to_base numeric(24,10) not null default 1,
  amount_base numeric(24,6) not null,
  running_balance_transaction numeric(24,6),
  raw_data jsonb not null default '{}'::jsonb,
  excluded_at timestamptz,
  excluded_by uuid references auth.users(id) on delete set null,
  exclusion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_bank_lines_import_fkey
    foreign key (business_id, import_id)
    references public.business_bank_statement_imports(business_id, id)
    on delete cascade,
  constraint business_bank_lines_account_fkey
    foreign key (business_id, bank_account_id)
    references public.business_bank_accounts(business_id, id)
    on delete restrict,
  constraint business_bank_lines_business_id_id_key unique (business_id, id),
  constraint business_bank_lines_number_key unique (import_id, line_number),
  constraint business_bank_lines_external_key unique (import_id, external_id),
  constraint business_bank_lines_number_check check (line_number between 1 and 5000),
  constraint business_bank_lines_description_check
    check (char_length(btrim(description)) between 1 and 500),
  constraint business_bank_lines_reference_check
    check (reference is null or char_length(btrim(reference)) <= 160),
  constraint business_bank_lines_external_check
    check (external_id is null or char_length(btrim(external_id)) <= 160),
  constraint business_bank_lines_amount_check
    check (amount_transaction <> 0 and amount_base <> 0 and exchange_rate_to_base > 0),
  constraint business_bank_lines_exclusion_check
    check (
      (excluded_at is null and excluded_by is null and exclusion_reason is null)
      or (excluded_at is not null and exclusion_reason is not null and char_length(btrim(exclusion_reason)) between 2 and 300)
    )
);

create table if not exists public.business_bank_reconciliations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bank_account_id uuid not null,
  statement_import_id uuid not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft',
  statement_opening_base numeric(24,6) not null,
  statement_closing_base numeric(24,6) not null,
  ledger_balance_base numeric(24,6),
  outstanding_debits_base numeric(24,6),
  outstanding_credits_base numeric(24,6),
  adjusted_statement_balance_base numeric(24,6),
  difference_base numeric(24,6),
  notes text,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  locked_by uuid references auth.users(id) on delete set null,
  locked_at timestamptz,
  reopened_by uuid references auth.users(id) on delete set null,
  reopened_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_bank_reconciliations_account_fkey
    foreign key (business_id, bank_account_id)
    references public.business_bank_accounts(business_id, id)
    on delete restrict,
  constraint business_bank_reconciliations_import_fkey
    foreign key (business_id, statement_import_id)
    references public.business_bank_statement_imports(business_id, id)
    on delete cascade,
  constraint business_bank_reconciliations_business_id_id_key unique (business_id, id),
  constraint business_bank_reconciliations_import_key unique (statement_import_id),
  constraint business_bank_reconciliations_period_check check (period_end >= period_start),
  constraint business_bank_reconciliations_status_check check (status in ('draft','completed','locked')),
  constraint business_bank_reconciliations_notes_check
    check (notes is null or char_length(btrim(notes)) <= 1000),
  constraint business_bank_reconciliations_state_check check (
    (status = 'draft' and completed_at is null and locked_at is null)
    or (status = 'completed' and completed_at is not null and locked_at is null)
    or (status = 'locked' and completed_at is not null and locked_at is not null)
  )
);

create table if not exists public.business_bank_matches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  statement_line_id uuid not null,
  journal_line_id uuid not null,
  amount_base numeric(24,6) not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_bank_matches_statement_fkey
    foreign key (business_id, statement_line_id)
    references public.business_bank_statement_lines(business_id, id)
    on delete cascade,
  constraint business_bank_matches_journal_fkey
    foreign key (business_id, journal_line_id)
    references public.business_journal_lines(business_id, id)
    on delete restrict,
  constraint business_bank_matches_business_id_id_key unique (business_id, id),
  constraint business_bank_matches_pair_key unique (statement_line_id, journal_line_id),
  constraint business_bank_matches_journal_key unique (journal_line_id),
  constraint business_bank_matches_amount_check check (amount_base > 0)
);

create index if not exists business_bank_accounts_business_active_idx
  on public.business_bank_accounts (business_id, is_active, name);
create index if not exists business_bank_accounts_created_by_idx
  on public.business_bank_accounts (created_by);
create index if not exists business_bank_accounts_updated_by_idx
  on public.business_bank_accounts (updated_by);
create index if not exists business_bank_imports_business_period_idx
  on public.business_bank_statement_imports (business_id, bank_account_id, period_end desc, created_at desc);
create index if not exists business_bank_imports_imported_by_idx
  on public.business_bank_statement_imports (imported_by);
create index if not exists business_bank_imports_reconciled_by_idx
  on public.business_bank_statement_imports (reconciled_by);
create index if not exists business_bank_imports_voided_by_idx
  on public.business_bank_statement_imports (voided_by);
create index if not exists business_bank_lines_account_date_idx
  on public.business_bank_statement_lines (business_id, bank_account_id, transaction_date desc, line_number desc);
create index if not exists business_bank_lines_import_idx
  on public.business_bank_statement_lines (business_id, import_id, line_number);
create index if not exists business_bank_lines_excluded_by_idx
  on public.business_bank_statement_lines (excluded_by);
create index if not exists business_bank_matches_statement_idx
  on public.business_bank_matches (business_id, statement_line_id);
create index if not exists business_bank_matches_created_by_idx
  on public.business_bank_matches (created_by);
create index if not exists business_bank_reconciliations_account_period_idx
  on public.business_bank_reconciliations (business_id, bank_account_id, period_end desc);
create index if not exists business_bank_reconciliations_completed_by_idx
  on public.business_bank_reconciliations (completed_by);
create index if not exists business_bank_reconciliations_locked_by_idx
  on public.business_bank_reconciliations (locked_by);
create index if not exists business_bank_reconciliations_reopened_by_idx
  on public.business_bank_reconciliations (reopened_by);
create index if not exists business_bank_reconciliations_created_by_idx
  on public.business_bank_reconciliations (created_by);

create or replace function private.enforce_business_banking_engine_write()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  action_name text := coalesce(current_setting('app.business_banking_action', true), '');
  allowed boolean := false;
begin
  if current_user <> 'postgres' then
    raise exception 'Business banking records are managed by the banking engine.' using errcode = '55000';
  end if;

  if tg_table_name = 'business_bank_accounts' then
    allowed := action_name in ('initialize','config');
  elsif tg_table_name = 'business_bank_statement_imports' then
    allowed := action_name in ('import','complete','reopen','lock','void');
  elsif tg_table_name = 'business_bank_statement_lines' then
    allowed := action_name in ('import','exclude','restore');
  elsif tg_table_name = 'business_bank_matches' then
    allowed := action_name in ('match','auto_match','unmatch');
  elsif tg_table_name = 'business_bank_reconciliations' then
    allowed := action_name in ('import','complete','reopen','lock');
  end if;

  if not allowed then
    raise exception 'Unsupported business banking write operation.' using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create trigger business_bank_accounts_engine_guard
before insert or update or delete on public.business_bank_accounts
for each row execute function private.enforce_business_banking_engine_write();
create trigger business_bank_imports_engine_guard
before insert or update or delete on public.business_bank_statement_imports
for each row execute function private.enforce_business_banking_engine_write();
create trigger business_bank_lines_engine_guard
before insert or update or delete on public.business_bank_statement_lines
for each row execute function private.enforce_business_banking_engine_write();
create trigger business_bank_matches_engine_guard
before insert or update or delete on public.business_bank_matches
for each row execute function private.enforce_business_banking_engine_write();
create trigger business_bank_reconciliations_engine_guard
before insert or update or delete on public.business_bank_reconciliations
for each row execute function private.enforce_business_banking_engine_write();

create trigger business_bank_accounts_touch_updated_at
before update on public.business_bank_accounts
for each row execute function private.set_business_workspace_updated_at();
create trigger business_bank_imports_touch_updated_at
before update on public.business_bank_statement_imports
for each row execute function private.set_business_workspace_updated_at();
create trigger business_bank_lines_touch_updated_at
before update on public.business_bank_statement_lines
for each row execute function private.set_business_workspace_updated_at();
create trigger business_bank_reconciliations_touch_updated_at
before update on public.business_bank_reconciliations
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.initialize_business_bank_account_from_chart()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  business_currency text;
  business_start date;
  business_owner uuid;
begin
  if new.account_type <> 'asset' or new.system_key is null or new.system_key not in ('bank','cash') then
    return new;
  end if;

  select business.base_currency, business.created_at::date, business.owner_user_id
  into business_currency, business_start, business_owner
  from public.businesses business
  where business.id = new.business_id and business.status = 'active';

  if business_currency is null then return new; end if;

  perform set_config('app.business_banking_action', 'initialize', true);
  insert into public.business_bank_accounts(
    business_id, ledger_account_id, name, institution_name, account_kind,
    currency, reconciliation_start_date, created_by, updated_by
  ) values (
    new.business_id, new.id, new.name,
    case when new.system_key = 'bank' then 'Primary bank' else 'Cash control' end,
    case when new.system_key = 'bank' then 'bank' else 'cash' end,
    business_currency, coalesce(business_start, current_date),
    coalesce(new.created_by, business_owner), coalesce(new.created_by, business_owner)
  )
  on conflict (business_id, ledger_account_id) do nothing;
  return new;
end;
$$;

create trigger initialize_business_bank_account_after_chart_insert
after insert on public.business_chart_of_accounts
for each row execute function private.initialize_business_bank_account_from_chart();

select set_config('app.business_banking_action', 'initialize', true);
insert into public.business_bank_accounts(
  business_id, ledger_account_id, name, institution_name, account_kind,
  currency, reconciliation_start_date, created_by, updated_by
)
select account.business_id, account.id, account.name,
       case when account.system_key = 'bank' then 'Primary bank' else 'Cash control' end,
       case when account.system_key = 'bank' then 'bank' else 'cash' end,
       business.base_currency, business.created_at::date,
       coalesce(account.created_by, business.owner_user_id), coalesce(account.created_by, business.owner_user_id)
from public.business_chart_of_accounts account
join public.businesses business on business.id = account.business_id and business.status = 'active'
where account.account_type = 'asset' and account.system_key in ('bank','cash')
on conflict (business_id, ledger_account_id) do nothing;

alter table public.business_bank_accounts enable row level security;
alter table public.business_bank_statement_imports enable row level security;
alter table public.business_bank_statement_lines enable row level security;
alter table public.business_bank_matches enable row level security;
alter table public.business_bank_reconciliations enable row level security;

create policy business_bank_accounts_select
on public.business_bank_accounts for select to authenticated
using (private.can_view_business_banking(business_id));
create policy business_bank_imports_select
on public.business_bank_statement_imports for select to authenticated
using (private.can_view_business_banking(business_id));
create policy business_bank_lines_select
on public.business_bank_statement_lines for select to authenticated
using (private.can_view_business_banking(business_id));
create policy business_bank_matches_select
on public.business_bank_matches for select to authenticated
using (private.can_view_business_banking(business_id));
create policy business_bank_reconciliations_select
on public.business_bank_reconciliations for select to authenticated
using (private.can_view_business_banking(business_id));

revoke all on public.business_bank_accounts from public, anon, authenticated;
revoke all on public.business_bank_statement_imports from public, anon, authenticated;
revoke all on public.business_bank_statement_lines from public, anon, authenticated;
revoke all on public.business_bank_matches from public, anon, authenticated;
revoke all on public.business_bank_reconciliations from public, anon, authenticated;
grant select on public.business_bank_accounts to authenticated;
grant select on public.business_bank_statement_imports to authenticated;
grant select on public.business_bank_statement_lines to authenticated;
grant select on public.business_bank_matches to authenticated;
grant select on public.business_bank_reconciliations to authenticated;
