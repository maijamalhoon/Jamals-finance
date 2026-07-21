create table if not exists public.business_accounting_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  accounting_basis text not null default 'accrual',
  rounding_scale smallint not null default 2,
  next_journal_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_accounting_settings_basis_check
    check (accounting_basis in ('accrual', 'cash')),
  constraint business_accounting_settings_rounding_check
    check (rounding_scale between 0 and 6),
  constraint business_accounting_settings_sequence_check
    check (next_journal_number > 0)
);

create table if not exists public.business_fiscal_periods (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'open',
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_fiscal_periods_dates_check check (starts_on <= ends_on),
  constraint business_fiscal_periods_status_check
    check (status in ('open', 'closed', 'locked')),
  constraint business_fiscal_periods_close_state_check check (
    (status = 'open' and closed_at is null and locked_at is null)
    or (status = 'closed' and closed_at is not null and locked_at is null)
    or (status = 'locked' and closed_at is not null and locked_at is not null)
  ),
  unique (business_id, starts_on, ends_on),
  unique (business_id, id)
);

create table if not exists public.business_chart_of_accounts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null,
  account_subtype text,
  normal_balance text not null,
  parent_account_id uuid,
  system_key text,
  allow_manual_posting boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_chart_accounts_code_check
    check (code ~ '^[A-Z0-9][A-Z0-9._-]{0,19}$'),
  constraint business_chart_accounts_name_check
    check (char_length(btrim(name)) between 2 and 120),
  constraint business_chart_accounts_type_check
    check (account_type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  constraint business_chart_accounts_normal_check
    check (normal_balance in ('debit', 'credit')),
  constraint business_chart_accounts_type_normal_check check (
    (account_type in ('asset', 'expense') and normal_balance = 'debit')
    or (account_type in ('liability', 'equity', 'revenue') and normal_balance = 'credit')
  ),
  unique (business_id, code),
  unique (business_id, id),
  unique nulls not distinct (business_id, system_key),
  foreign key (business_id, parent_account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict
);

create table if not exists public.business_journal_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  journal_number bigint,
  entry_date date not null,
  fiscal_period_id uuid not null,
  source_type text not null default 'manual',
  source_id uuid,
  reference text,
  description text not null,
  status text not null default 'draft',
  transaction_currency text not null,
  exchange_rate numeric(24, 10) not null default 1,
  total_debit_base numeric(24, 6) not null default 0,
  total_credit_base numeric(24, 6) not null default 0,
  reversal_of_entry_id uuid,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_by uuid references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_journal_entries_description_check
    check (char_length(btrim(description)) between 2 and 500),
  constraint business_journal_entries_status_check
    check (status in ('draft', 'posted', 'reversed')),
  constraint business_journal_entries_currency_check
    check (public.is_supported_financial_currency(transaction_currency)),
  constraint business_journal_entries_exchange_rate_check
    check (exchange_rate > 0),
  constraint business_journal_entries_totals_check
    check (total_debit_base >= 0 and total_credit_base >= 0),
  constraint business_journal_entries_post_state_check check (
    (status = 'draft'
      and journal_number is null
      and posted_by is null
      and posted_at is null
      and total_debit_base = 0
      and total_credit_base = 0)
    or (status in ('posted', 'reversed')
      and journal_number is not null
      and posted_by is not null
      and posted_at is not null
      and total_debit_base > 0
      and total_debit_base = total_credit_base)
  ),
  unique (business_id, journal_number),
  unique (business_id, id),
  foreign key (business_id, fiscal_period_id)
    references public.business_fiscal_periods(business_id, id)
    on delete restrict,
  foreign key (business_id, reversal_of_entry_id)
    references public.business_journal_entries(business_id, id)
    on delete restrict
);

create table if not exists public.business_journal_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  journal_entry_id uuid not null,
  line_number smallint not null,
  account_id uuid not null,
  description text,
  debit_transaction numeric(24, 6) not null default 0,
  credit_transaction numeric(24, 6) not null default 0,
  debit_base numeric(24, 6) not null default 0,
  credit_base numeric(24, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_journal_lines_number_check check (line_number > 0),
  constraint business_journal_lines_transaction_side_check check (
    debit_transaction >= 0
    and credit_transaction >= 0
    and ((debit_transaction > 0 and credit_transaction = 0)
      or (credit_transaction > 0 and debit_transaction = 0))
  ),
  constraint business_journal_lines_base_side_check check (
    debit_base >= 0
    and credit_base >= 0
    and ((debit_base > 0 and credit_base = 0)
      or (credit_base > 0 and debit_base = 0))
  ),
  unique (business_id, journal_entry_id, line_number),
  foreign key (business_id, journal_entry_id)
    references public.business_journal_entries(business_id, id)
    on delete cascade,
  foreign key (business_id, account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict
);

create index if not exists business_fiscal_periods_business_status_dates_idx
  on public.business_fiscal_periods(business_id, status, starts_on, ends_on);
create index if not exists business_chart_accounts_business_active_code_idx
  on public.business_chart_of_accounts(business_id, is_active, code);
create index if not exists business_chart_accounts_parent_idx
  on public.business_chart_of_accounts(business_id, parent_account_id)
  where parent_account_id is not null;
create index if not exists business_journal_entries_business_date_idx
  on public.business_journal_entries(business_id, entry_date desc, created_at desc);
create index if not exists business_journal_entries_period_status_idx
  on public.business_journal_entries(business_id, fiscal_period_id, status);
create index if not exists business_journal_entries_source_idx
  on public.business_journal_entries(business_id, source_type, source_id)
  where source_id is not null;
create index if not exists business_journal_entries_reversal_idx
  on public.business_journal_entries(business_id, reversal_of_entry_id)
  where reversal_of_entry_id is not null;
create index if not exists business_journal_entries_created_by_idx
  on public.business_journal_entries(created_by);
create index if not exists business_journal_entries_posted_by_idx
  on public.business_journal_entries(posted_by)
  where posted_by is not null;
create index if not exists business_journal_lines_entry_idx
  on public.business_journal_lines(business_id, journal_entry_id, line_number);
create index if not exists business_journal_lines_account_idx
  on public.business_journal_lines(business_id, account_id, journal_entry_id);
create index if not exists business_fiscal_periods_closed_by_idx
  on public.business_fiscal_periods(closed_by)
  where closed_by is not null;
create index if not exists business_chart_accounts_created_by_idx
  on public.business_chart_of_accounts(created_by)
  where created_by is not null;

create trigger business_accounting_settings_set_updated_at
before update on public.business_accounting_settings
for each row execute function private.set_business_workspace_updated_at();

create trigger business_fiscal_periods_set_updated_at
before update on public.business_fiscal_periods
for each row execute function private.set_business_workspace_updated_at();

create trigger business_chart_accounts_set_updated_at
before update on public.business_chart_of_accounts
for each row execute function private.set_business_workspace_updated_at();

create trigger business_journal_entries_set_updated_at
before update on public.business_journal_entries
for each row execute function private.set_business_workspace_updated_at();

create trigger business_journal_lines_set_updated_at
before update on public.business_journal_lines
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.initialize_business_accounting(
  p_business_id uuid,
  p_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  fiscal_start_month smallint;
  fiscal_start_year integer;
  period_start date;
  period_end date;
  period_name text;
begin
  if not exists (
    select 1
    from public.businesses business
    where business.id = p_business_id
      and business.owner_user_id = p_owner_id
      and business.status = 'active'
  ) then
    raise exception 'Business owner verification failed.' using errcode = '42501';
  end if;

  select fiscal_year_start_month
  into fiscal_start_month
  from public.businesses
  where id = p_business_id;

  fiscal_start_year := extract(year from current_date)::integer;
  if extract(month from current_date)::integer < fiscal_start_month then
    fiscal_start_year := fiscal_start_year - 1;
  end if;

  period_start := make_date(fiscal_start_year, fiscal_start_month, 1);
  period_end := (period_start + interval '1 year - 1 day')::date;
  period_name := format(
    'FY %s-%s',
    to_char(period_start, 'YYYY'),
    to_char(period_end, 'YYYY')
  );

  insert into public.business_accounting_settings (business_id)
  values (p_business_id)
  on conflict (business_id) do nothing;

  insert into public.business_fiscal_periods (
    business_id,
    name,
    starts_on,
    ends_on,
    status
  )
  values (
    p_business_id,
    period_name,
    period_start,
    period_end,
    'open'
  )
  on conflict (business_id, starts_on, ends_on) do nothing;

  insert into public.business_chart_of_accounts (
    business_id,
    code,
    name,
    account_type,
    account_subtype,
    normal_balance,
    system_key,
    allow_manual_posting,
    created_by
  )
  values
    (p_business_id, '1000', 'Cash and cash equivalents', 'asset', 'cash', 'debit', 'cash', true, p_owner_id),
    (p_business_id, '1100', 'Bank accounts', 'asset', 'bank', 'debit', 'bank', true, p_owner_id),
    (p_business_id, '1200', 'Accounts receivable', 'asset', 'receivable', 'debit', 'accounts_receivable', false, p_owner_id),
    (p_business_id, '1300', 'Inventory', 'asset', 'inventory', 'debit', 'inventory', false, p_owner_id),
    (p_business_id, '1400', 'Prepaid expenses', 'asset', 'prepaid', 'debit', 'prepaid_expenses', true, p_owner_id),
    (p_business_id, '1500', 'Property, plant and equipment', 'asset', 'fixed_asset', 'debit', 'fixed_assets', true, p_owner_id),
    (p_business_id, '2000', 'Accounts payable', 'liability', 'payable', 'credit', 'accounts_payable', false, p_owner_id),
    (p_business_id, '2100', 'Taxes payable', 'liability', 'tax', 'credit', 'taxes_payable', false, p_owner_id),
    (p_business_id, '2200', 'Accrued expenses', 'liability', 'accrual', 'credit', 'accrued_expenses', true, p_owner_id),
    (p_business_id, '2300', 'Loans payable', 'liability', 'loan', 'credit', 'loans_payable', true, p_owner_id),
    (p_business_id, '3000', 'Owner capital', 'equity', 'capital', 'credit', 'owner_capital', true, p_owner_id),
    (p_business_id, '3100', 'Owner drawings', 'equity', 'drawings', 'credit', 'owner_drawings', true, p_owner_id),
    (p_business_id, '3200', 'Retained earnings', 'equity', 'retained_earnings', 'credit', 'retained_earnings', false, p_owner_id),
    (p_business_id, '4000', 'Sales revenue', 'revenue', 'sales', 'credit', 'sales_revenue', true, p_owner_id),
    (p_business_id, '4100', 'Service revenue', 'revenue', 'services', 'credit', 'service_revenue', true, p_owner_id),
    (p_business_id, '4200', 'Other income', 'revenue', 'other_income', 'credit', 'other_income', true, p_owner_id),
    (p_business_id, '5000', 'Cost of goods sold', 'expense', 'cost_of_sales', 'debit', 'cost_of_goods_sold', false, p_owner_id),
    (p_business_id, '6000', 'Operating expenses', 'expense', 'operating', 'debit', 'operating_expenses', true, p_owner_id),
    (p_business_id, '6100', 'Salaries and wages', 'expense', 'payroll', 'debit', 'salaries_wages', true, p_owner_id),
    (p_business_id, '6200', 'Rent expense', 'expense', 'rent', 'debit', 'rent_expense', true, p_owner_id),
    (p_business_id, '6300', 'Utilities expense', 'expense', 'utilities', 'debit', 'utilities_expense', true, p_owner_id),
    (p_business_id, '6400', 'Marketing expense', 'expense', 'marketing', 'debit', 'marketing_expense', true, p_owner_id),
    (p_business_id, '6500', 'Bank charges', 'expense', 'bank_fees', 'debit', 'bank_charges', true, p_owner_id),
    (p_business_id, '6600', 'Depreciation expense', 'expense', 'depreciation', 'debit', 'depreciation_expense', true, p_owner_id),
    (p_business_id, '6900', 'Other expenses', 'expense', 'other_expense', 'debit', 'other_expenses', true, p_owner_id)
  on conflict (business_id, code) do nothing;
end;
$$;

revoke execute on function private.initialize_business_accounting(uuid, uuid)
  from public, anon, authenticated;

create or replace function private.initialize_business_accounting_on_owner()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.role = 'owner' and new.status = 'active' then
    perform private.initialize_business_accounting(new.business_id, new.user_id);
  end if;
  return new;
end;
$$;

revoke execute on function private.initialize_business_accounting_on_owner()
  from public, anon, authenticated;

drop trigger if exists business_members_initialize_accounting
  on public.business_members;
create trigger business_members_initialize_accounting
after insert on public.business_members
for each row execute function private.initialize_business_accounting_on_owner();

create or replace function private.prepare_business_journal_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_entry_id uuid;
  entry_business_id uuid;
  entry_status text;
  entry_exchange_rate numeric(24, 10);
  rounding_scale smallint;
  account_valid boolean;
begin
  target_entry_id := case
    when tg_op = 'DELETE' then old.journal_entry_id
    else new.journal_entry_id
  end;

  select entry.business_id, entry.status, entry.exchange_rate
  into entry_business_id, entry_status, entry_exchange_rate
  from public.business_journal_entries entry
  where entry.id = target_entry_id
  for update;

  if not found then
    raise exception 'Journal entry does not exist.' using errcode = '23503';
  end if;

  if entry_status <> 'draft' then
    raise exception 'Posted journal lines are immutable.' using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.business_id <> entry_business_id then
    raise exception 'Journal line tenant does not match its entry.' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.business_chart_of_accounts account
    where account.id = new.account_id
      and account.business_id = new.business_id
      and account.is_active
      and account.allow_manual_posting
  )
  into account_valid;

  if not account_valid then
    raise exception 'Account is inactive, restricted, or belongs to another business.'
      using errcode = '23514';
  end if;

  select settings.rounding_scale
  into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id = new.business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  new.debit_base := round(new.debit_transaction * entry_exchange_rate, rounding_scale);
  new.credit_base := round(new.credit_transaction * entry_exchange_rate, rounding_scale);
  return new;
end;
$$;

revoke execute on function private.prepare_business_journal_line()
  from public, anon, authenticated;

drop trigger if exists business_journal_lines_prepare
  on public.business_journal_lines;
create trigger business_journal_lines_prepare
before insert or update or delete on public.business_journal_lines
for each row execute function private.prepare_business_journal_line();

create or replace function private.enforce_business_journal_entry_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  line_count integer;
  debit_transaction_total numeric(24, 6);
  credit_transaction_total numeric(24, 6);
  debit_base_total numeric(24, 6);
  credit_base_total numeric(24, 6);
  assigned_number bigint;
  period_status text;
  period_start date;
  period_end date;
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Posted journal entries cannot be deleted.' using errcode = '55000';
    end if;
    return old;
  end if;

  if old.status <> 'draft' then
    raise exception 'Posted journal entries are immutable. Use a reversal entry.'
      using errcode = '55000';
  end if;

  if new.business_id <> old.business_id
    or new.created_by <> old.created_by
    or new.fiscal_period_id <> old.fiscal_period_id
  then
    raise exception 'Journal ownership and fiscal period cannot be reassigned.'
      using errcode = '23514';
  end if;

  if new.status = 'draft' then
    if new.journal_number is not null
      or new.posted_by is not null
      or new.posted_at is not null
      or new.total_debit_base <> 0
      or new.total_credit_base <> 0
    then
      raise exception 'Draft posting fields are managed by the accounting engine.'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.status <> 'posted' then
    raise exception 'Unsupported journal state transition.' using errcode = '23514';
  end if;

  select period.status, period.starts_on, period.ends_on
  into period_status, period_start, period_end
  from public.business_fiscal_periods period
  where period.id = new.fiscal_period_id
    and period.business_id = new.business_id
  for update;

  if not found or period_status <> 'open' then
    raise exception 'The fiscal period is not open.' using errcode = '55000';
  end if;

  if new.entry_date < period_start or new.entry_date > period_end then
    raise exception 'Entry date is outside its fiscal period.' using errcode = '22008';
  end if;

  select
    count(*),
    coalesce(sum(line.debit_transaction), 0),
    coalesce(sum(line.credit_transaction), 0),
    coalesce(sum(line.debit_base), 0),
    coalesce(sum(line.credit_base), 0)
  into
    line_count,
    debit_transaction_total,
    credit_transaction_total,
    debit_base_total,
    credit_base_total
  from public.business_journal_lines line
  where line.business_id = new.business_id
    and line.journal_entry_id = new.id;

  if line_count < 2 then
    raise exception 'A journal entry requires at least two lines.' using errcode = '23514';
  end if;

  if debit_transaction_total <= 0
    or debit_transaction_total <> credit_transaction_total
  then
    raise exception 'Transaction-currency debits and credits must balance exactly.'
      using errcode = '23514';
  end if;

  if debit_base_total <= 0 or debit_base_total <> credit_base_total then
    raise exception 'Base-currency debits and credits must balance after rounding.'
      using errcode = '23514';
  end if;

  update public.business_accounting_settings settings
  set next_journal_number = settings.next_journal_number + 1,
      updated_at = now()
  where settings.business_id = new.business_id
  returning next_journal_number - 1 into assigned_number;

  if assigned_number is null then
    raise exception 'Accounting sequence is missing.' using errcode = '23503';
  end if;

  new.journal_number := assigned_number;
  new.total_debit_base := debit_base_total;
  new.total_credit_base := credit_base_total;
  new.posted_by := auth.uid();
  new.posted_at := now();
  return new;
end;
$$;

revoke execute on function private.enforce_business_journal_entry_state()
  from public, anon, authenticated;

drop trigger if exists business_journal_entries_enforce_state
  on public.business_journal_entries;
create trigger business_journal_entries_enforce_state
before update or delete on public.business_journal_entries
for each row execute function private.enforce_business_journal_entry_state();

alter table public.business_accounting_settings enable row level security;
alter table public.business_fiscal_periods enable row level security;
alter table public.business_chart_of_accounts enable row level security;
alter table public.business_journal_entries enable row level security;
alter table public.business_journal_lines enable row level security;

revoke all privileges on table
  public.business_accounting_settings,
  public.business_fiscal_periods,
  public.business_chart_of_accounts,
  public.business_journal_entries,
  public.business_journal_lines
from anon, authenticated;

grant select, update on table public.business_accounting_settings to authenticated;
grant select, insert, update, delete on table public.business_fiscal_periods to authenticated;
grant select, insert, update, delete on table public.business_chart_of_accounts to authenticated;
grant select, insert, update, delete on table public.business_journal_entries to authenticated;
grant select, insert, update, delete on table public.business_journal_lines to authenticated;

grant select, insert, update, delete on table
  public.business_accounting_settings,
  public.business_fiscal_periods,
  public.business_chart_of_accounts,
  public.business_journal_entries,
  public.business_journal_lines
to service_role;

create policy business_accounting_settings_select_member
on public.business_accounting_settings
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_accounting_settings_update_manager
on public.business_accounting_settings
for update to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
)
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_fiscal_periods_select_member
on public.business_fiscal_periods
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_fiscal_periods_manage_accounting
on public.business_fiscal_periods
for all to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
)
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_chart_accounts_select_member
on public.business_chart_of_accounts
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_chart_accounts_manage_accounting
on public.business_chart_of_accounts
for all to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
)
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_journal_entries_select_member
on public.business_journal_entries
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_journal_entries_insert_manager
on public.business_journal_entries
for insert to authenticated
with check (
  created_by = (select auth.uid())
  and status = 'draft'
  and business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_journal_entries_update_manager
on public.business_journal_entries
for update to authenticated
using (
  status = 'draft'
  and business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
)
with check (
  created_by = (select auth.uid())
  and business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_journal_entries_delete_manager
on public.business_journal_entries
for delete to authenticated
using (
  status = 'draft'
  and business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_journal_lines_select_member
on public.business_journal_lines
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_journal_lines_insert_manager
on public.business_journal_lines
for insert to authenticated
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
  and exists (
    select 1
    from public.business_journal_entries entry
    where entry.id = journal_entry_id
      and entry.business_id = business_journal_lines.business_id
      and entry.status = 'draft'
      and entry.created_by = (select auth.uid())
  )
);

create policy business_journal_lines_update_manager
on public.business_journal_lines
for update to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
  and exists (
    select 1
    from public.business_journal_entries entry
    where entry.id = journal_entry_id
      and entry.business_id = business_journal_lines.business_id
      and entry.status = 'draft'
  )
)
with check (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
);

create policy business_journal_lines_delete_manager
on public.business_journal_lines
for delete to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  )
  and exists (
    select 1
    from public.business_journal_entries entry
    where entry.id = journal_entry_id
      and entry.business_id = business_journal_lines.business_id
      and entry.status = 'draft'
  )
);

create or replace function public.post_business_journal_entry(
  p_business_id uuid,
  p_entry_date date,
  p_description text,
  p_reference text default null,
  p_source_type text default 'manual',
  p_source_id uuid default null,
  p_transaction_currency text default null,
  p_exchange_rate numeric default 1,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  business_base_currency text;
  normalized_currency text;
  selected_period_id uuid;
  created_entry_id uuid;
  line_item jsonb;
  account_uuid uuid;
  debit_amount numeric(24, 6);
  credit_amount numeric(24, 6);
  line_description text;
  line_number smallint := 0;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.business_members membership
    where membership.business_id = p_business_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant')
        or '*' = any(membership.permissions)
        or 'accounting.manage' = any(membership.permissions)
      )
  ) then
    raise exception 'Accounting permission required.' using errcode = '42501';
  end if;

  select business.base_currency
  into business_base_currency
  from public.businesses business
  where business.id = p_business_id
    and business.status = 'active';

  if business_base_currency is null then
    raise exception 'Active business not found.' using errcode = 'P0002';
  end if;

  if p_entry_date is null then
    raise exception 'Entry date is required.' using errcode = '22004';
  end if;

  if char_length(btrim(coalesce(p_description, ''))) < 2 then
    raise exception 'Journal description is required.' using errcode = '22023';
  end if;

  normalized_currency := upper(btrim(coalesce(p_transaction_currency, business_base_currency)));
  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported transaction currency.' using errcode = '22023';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Exchange rate must be greater than zero.' using errcode = '22023';
  end if;

  if normalized_currency = business_base_currency and p_exchange_rate <> 1 then
    raise exception 'Base-currency journal entries must use an exchange rate of 1.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) < 2
    or jsonb_array_length(p_lines) > 200
  then
    raise exception 'Journal entries require 2 to 200 lines.' using errcode = '22023';
  end if;

  select period.id
  into selected_period_id
  from public.business_fiscal_periods period
  where period.business_id = p_business_id
    and period.status = 'open'
    and p_entry_date between period.starts_on and period.ends_on
  order by period.starts_on desc
  limit 1;

  if selected_period_id is null then
    raise exception 'No open fiscal period contains the entry date.' using errcode = '22008';
  end if;

  insert into public.business_journal_entries (
    business_id,
    entry_date,
    fiscal_period_id,
    source_type,
    source_id,
    reference,
    description,
    status,
    transaction_currency,
    exchange_rate,
    created_by
  )
  values (
    p_business_id,
    p_entry_date,
    selected_period_id,
    lower(btrim(coalesce(p_source_type, 'manual'))),
    p_source_id,
    nullif(btrim(coalesce(p_reference, '')), ''),
    btrim(p_description),
    'draft',
    normalized_currency,
    p_exchange_rate,
    current_user_id
  )
  returning id into created_entry_id;

  for line_item in select value from jsonb_array_elements(p_lines)
  loop
    line_number := line_number + 1;

    begin
      account_uuid := (line_item ->> 'account_id')::uuid;
      debit_amount := coalesce(nullif(line_item ->> 'debit', '')::numeric, 0);
      credit_amount := coalesce(nullif(line_item ->> 'credit', '')::numeric, 0);
    exception
      when invalid_text_representation then
        raise exception 'Every journal line requires a valid account and numeric amount.'
          using errcode = '22023';
    end;

    line_description := nullif(btrim(coalesce(line_item ->> 'description', '')), '');

    insert into public.business_journal_lines (
      business_id,
      journal_entry_id,
      line_number,
      account_id,
      description,
      debit_transaction,
      credit_transaction
    )
    values (
      p_business_id,
      created_entry_id,
      line_number,
      account_uuid,
      line_description,
      debit_amount,
      credit_amount
    );
  end loop;

  update public.business_journal_entries
  set status = 'posted'
  where id = created_entry_id
    and business_id = p_business_id;

  return created_entry_id;
end;
$$;

revoke execute on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) from public, anon;
grant execute on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) to authenticated, service_role;

create or replace view public.business_trial_balance
with (security_invoker = true)
as
select
  account.business_id,
  account.id as account_id,
  account.code,
  account.name,
  account.account_type,
  account.normal_balance,
  coalesce(sum(line.debit_base), 0)::numeric(24, 6) as total_debit,
  coalesce(sum(line.credit_base), 0)::numeric(24, 6) as total_credit,
  case
    when account.normal_balance = 'debit'
      then (coalesce(sum(line.debit_base), 0) - coalesce(sum(line.credit_base), 0))::numeric(24, 6)
    else (coalesce(sum(line.credit_base), 0) - coalesce(sum(line.debit_base), 0))::numeric(24, 6)
  end as balance
from public.business_chart_of_accounts account
left join public.business_journal_lines line
  on line.business_id = account.business_id
  and line.account_id = account.id
left join public.business_journal_entries entry
  on entry.business_id = line.business_id
  and entry.id = line.journal_entry_id
  and entry.status in ('posted', 'reversed')
where line.id is null or entry.id is not null
group by
  account.business_id,
  account.id,
  account.code,
  account.name,
  account.account_type,
  account.normal_balance;

revoke all privileges on table public.business_trial_balance from anon, authenticated;
grant select on table public.business_trial_balance to authenticated, service_role;

do $$
declare
  business_record record;
begin
  for business_record in
    select business.id, business.owner_user_id
    from public.businesses business
    where business.status = 'active'
  loop
    perform private.initialize_business_accounting(
      business_record.id,
      business_record.owner_user_id
    );
  end loop;
end;
$$;

comment on table public.business_chart_of_accounts is
  'Tenant-scoped chart of accounts using debit and credit normal-balance rules.';
comment on table public.business_journal_entries is
  'Double-entry journal headers. Posted rows are immutable and corrected through reversals.';
comment on table public.business_journal_lines is
  'Journal debit and credit lines in transaction and business base currency.';
comment on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) is
  'Posts one balanced tenant-scoped journal atomically through RLS and accounting triggers.';