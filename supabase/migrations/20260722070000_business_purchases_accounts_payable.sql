create table if not exists public.business_purchase_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  bill_prefix text not null default 'BILL',
  next_bill_number bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_purchase_settings_prefix_check
    check (bill_prefix ~ '^[A-Z0-9][A-Z0-9-]{0,9}$'),
  constraint business_purchase_settings_sequence_check
    check (next_bill_number > 0)
);

create table if not exists public.business_supplier_bills (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid not null,
  bill_number bigint,
  bill_code text,
  supplier_document_number text,
  bill_date date not null,
  due_date date not null,
  status text not null default 'draft',
  currency text not null,
  exchange_rate numeric(24, 10) not null default 1,
  subtotal_transaction numeric(24, 6) not null default 0,
  discount_transaction numeric(24, 6) not null default 0,
  tax_transaction numeric(24, 6) not null default 0,
  total_transaction numeric(24, 6) not null default 0,
  paid_transaction numeric(24, 6) not null default 0,
  subtotal_base numeric(24, 6) not null default 0,
  discount_base numeric(24, 6) not null default 0,
  tax_base numeric(24, 6) not null default 0,
  total_base numeric(24, 6) not null default 0,
  paid_base numeric(24, 6) not null default 0,
  journal_entry_id uuid,
  notes text,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_supplier_bills_dates_check check (bill_date <= due_date),
  constraint business_supplier_bills_status_check
    check (status in ('draft', 'issued', 'partially_paid', 'paid')),
  constraint business_supplier_bills_currency_check
    check (public.is_supported_financial_currency(currency)),
  constraint business_supplier_bills_exchange_rate_check check (exchange_rate > 0),
  constraint business_supplier_bills_amounts_check check (
    subtotal_transaction >= 0
    and discount_transaction >= 0
    and discount_transaction <= subtotal_transaction
    and tax_transaction >= 0
    and total_transaction = subtotal_transaction - discount_transaction + tax_transaction
    and paid_transaction >= 0
    and paid_transaction <= total_transaction
    and subtotal_base >= 0
    and discount_base >= 0
    and discount_base <= subtotal_base
    and tax_base >= 0
    and total_base = subtotal_base - discount_base + tax_base
    and paid_base >= 0
    and paid_base <= total_base
  ),
  constraint business_supplier_bills_state_check check (
    (
      status = 'draft'
      and bill_number is null
      and bill_code is null
      and journal_entry_id is null
      and issued_at is null
      and paid_transaction = 0
      and paid_base = 0
    )
    or (
      status = 'issued'
      and bill_number is not null
      and bill_code is not null
      and journal_entry_id is not null
      and issued_at is not null
      and total_transaction > 0
      and total_base > 0
      and paid_transaction = 0
      and paid_base = 0
    )
    or (
      status = 'partially_paid'
      and bill_number is not null
      and bill_code is not null
      and journal_entry_id is not null
      and issued_at is not null
      and paid_transaction > 0
      and paid_transaction < total_transaction
      and paid_base > 0
      and paid_base < total_base
    )
    or (
      status = 'paid'
      and bill_number is not null
      and bill_code is not null
      and journal_entry_id is not null
      and issued_at is not null
      and paid_transaction = total_transaction
      and paid_base = total_base
      and total_transaction > 0
      and total_base > 0
    )
  ),
  constraint business_supplier_bills_notes_check
    check (notes is null or char_length(notes) <= 2000),
  constraint business_supplier_bills_supplier_document_check
    check (
      supplier_document_number is null
      or char_length(btrim(supplier_document_number)) between 1 and 120
    ),
  constraint business_supplier_bills_idempotency_check
    check (idempotency_key is null or char_length(idempotency_key) between 8 and 160),
  unique (business_id, id),
  unique (business_id, bill_number),
  unique (business_id, bill_code),
  unique nulls not distinct (business_id, idempotency_key),
  foreign key (business_id, supplier_id)
    references public.business_contacts(business_id, id)
    on delete restrict,
  foreign key (business_id, journal_entry_id)
    references public.business_journal_entries(business_id, id)
    on delete restrict
);

create table if not exists public.business_supplier_bill_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bill_id uuid not null,
  line_number smallint not null,
  description text not null,
  quantity numeric(24, 6) not null,
  unit_cost_transaction numeric(24, 6) not null,
  discount_percent numeric(9, 6) not null default 0,
  tax_rate numeric(9, 6) not null default 0,
  allocation_account_id uuid not null,
  gross_transaction numeric(24, 6) not null default 0,
  discount_transaction numeric(24, 6) not null default 0,
  net_transaction numeric(24, 6) not null default 0,
  tax_transaction numeric(24, 6) not null default 0,
  total_transaction numeric(24, 6) not null default 0,
  gross_base numeric(24, 6) not null default 0,
  discount_base numeric(24, 6) not null default 0,
  net_base numeric(24, 6) not null default 0,
  tax_base numeric(24, 6) not null default 0,
  total_base numeric(24, 6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_supplier_bill_lines_number_check check (line_number > 0),
  constraint business_supplier_bill_lines_description_check
    check (char_length(btrim(description)) between 2 and 300),
  constraint business_supplier_bill_lines_quantity_check check (quantity > 0),
  constraint business_supplier_bill_lines_unit_cost_check check (unit_cost_transaction >= 0),
  constraint business_supplier_bill_lines_discount_rate_check
    check (discount_percent between 0 and 100),
  constraint business_supplier_bill_lines_tax_rate_check check (tax_rate between 0 and 100),
  constraint business_supplier_bill_lines_amounts_check check (
    gross_transaction >= 0
    and discount_transaction >= 0
    and discount_transaction <= gross_transaction
    and net_transaction = gross_transaction - discount_transaction
    and tax_transaction >= 0
    and total_transaction = net_transaction + tax_transaction
    and gross_base >= 0
    and discount_base >= 0
    and discount_base <= gross_base
    and net_base = gross_base - discount_base
    and tax_base >= 0
    and total_base = net_base + tax_base
  ),
  unique (business_id, bill_id, line_number),
  foreign key (business_id, bill_id)
    references public.business_supplier_bills(business_id, id)
    on delete cascade,
  foreign key (business_id, allocation_account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict
);

create table if not exists public.business_supplier_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bill_id uuid not null,
  payment_date date not null,
  amount_transaction numeric(24, 6) not null,
  amount_base numeric(24, 6) not null,
  payment_account_id uuid not null,
  reference text,
  status text not null default 'draft',
  journal_entry_id uuid,
  idempotency_key text,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_supplier_payments_amount_check
    check (amount_transaction > 0 and amount_base > 0),
  constraint business_supplier_payments_status_check check (status in ('draft', 'posted')),
  constraint business_supplier_payments_state_check check (
    (status = 'draft' and journal_entry_id is null and posted_at is null)
    or (status = 'posted' and journal_entry_id is not null and posted_at is not null)
  ),
  constraint business_supplier_payments_reference_check
    check (reference is null or char_length(reference) <= 240),
  constraint business_supplier_payments_idempotency_check
    check (idempotency_key is null or char_length(idempotency_key) between 8 and 160),
  unique (business_id, id),
  unique nulls not distinct (business_id, idempotency_key),
  foreign key (business_id, bill_id)
    references public.business_supplier_bills(business_id, id)
    on delete restrict,
  foreign key (business_id, payment_account_id)
    references public.business_chart_of_accounts(business_id, id)
    on delete restrict,
  foreign key (business_id, journal_entry_id)
    references public.business_journal_entries(business_id, id)
    on delete restrict
);

create index if not exists business_supplier_bills_business_date_status_idx
  on public.business_supplier_bills(business_id, bill_date desc, status);
create index if not exists business_supplier_bills_supplier_due_idx
  on public.business_supplier_bills(business_id, supplier_id, due_date, status);
create index if not exists business_supplier_bills_journal_idx
  on public.business_supplier_bills(business_id, journal_entry_id)
  where journal_entry_id is not null;
create unique index if not exists business_supplier_bills_supplier_document_unique_idx
  on public.business_supplier_bills(
    business_id,
    supplier_id,
    lower(supplier_document_number)
  )
  where supplier_document_number is not null;
create index if not exists business_supplier_bills_created_by_idx
  on public.business_supplier_bills(created_by);
create index if not exists business_supplier_bill_lines_bill_idx
  on public.business_supplier_bill_lines(business_id, bill_id, line_number);
create index if not exists business_supplier_bill_lines_allocation_idx
  on public.business_supplier_bill_lines(business_id, allocation_account_id, bill_id);
create index if not exists business_supplier_payments_bill_date_idx
  on public.business_supplier_payments(business_id, bill_id, payment_date desc);
create index if not exists business_supplier_payments_journal_idx
  on public.business_supplier_payments(business_id, journal_entry_id)
  where journal_entry_id is not null;
create index if not exists business_supplier_payments_account_idx
  on public.business_supplier_payments(business_id, payment_account_id, payment_date desc);
create index if not exists business_supplier_payments_created_by_idx
  on public.business_supplier_payments(created_by);

create trigger business_purchase_settings_set_updated_at
before update on public.business_purchase_settings
for each row execute function private.set_business_workspace_updated_at();

create trigger business_supplier_bills_set_updated_at
before update on public.business_supplier_bills
for each row execute function private.set_business_workspace_updated_at();

create trigger business_supplier_bill_lines_set_updated_at
before update on public.business_supplier_bill_lines
for each row execute function private.set_business_workspace_updated_at();

create trigger business_supplier_payments_set_updated_at
before update on public.business_supplier_payments
for each row execute function private.set_business_workspace_updated_at();

create or replace function private.prepare_business_supplier_bill_line()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bill_status text;
  bill_exchange_rate numeric(24, 10);
  rounding_scale smallint;
  allocation_valid boolean;
begin
  select bill.status, bill.exchange_rate
  into bill_status, bill_exchange_rate
  from public.business_supplier_bills bill
  where bill.id = coalesce(new.bill_id, old.bill_id)
    and bill.business_id = coalesce(new.business_id, old.business_id)
  for update;

  if not found then
    raise exception 'Supplier bill does not exist.' using errcode = '23503';
  end if;

  if bill_status <> 'draft' then
    raise exception 'Issued supplier bill lines are immutable.' using errcode = '55000';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  select exists (
    select 1
    from public.business_chart_of_accounts account
    where account.id = new.allocation_account_id
      and account.business_id = new.business_id
      and account.is_active
      and (
        account.account_type = 'expense'
        or (
          account.account_type = 'asset'
          and account.system_key in ('inventory', 'prepaid_expenses', 'fixed_assets')
        )
      )
  ) into allocation_valid;

  if not allocation_valid then
    raise exception 'Allocation account must be an active expense, inventory, prepaid, or fixed-asset account.'
      using errcode = '23514';
  end if;

  select settings.rounding_scale
  into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id = new.business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  new.description := btrim(new.description);
  new.gross_transaction := round(new.quantity * new.unit_cost_transaction, rounding_scale);
  new.discount_transaction := round(
    new.gross_transaction * (new.discount_percent / 100),
    rounding_scale
  );
  new.net_transaction := new.gross_transaction - new.discount_transaction;
  new.tax_transaction := round(new.net_transaction * (new.tax_rate / 100), rounding_scale);
  new.total_transaction := new.net_transaction + new.tax_transaction;

  new.gross_base := round(new.gross_transaction * bill_exchange_rate, rounding_scale);
  new.discount_base := round(new.discount_transaction * bill_exchange_rate, rounding_scale);
  new.net_base := new.gross_base - new.discount_base;
  new.tax_base := round(new.tax_transaction * bill_exchange_rate, rounding_scale);
  new.total_base := new.net_base + new.tax_base;

  return new;
end;
$$;

revoke execute on function private.prepare_business_supplier_bill_line()
  from public, anon, authenticated;

create trigger business_supplier_bill_lines_prepare
before insert or update or delete on public.business_supplier_bill_lines
for each row execute function private.prepare_business_supplier_bill_line();

create or replace function private.enforce_business_supplier_bill_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Issued supplier bills cannot be deleted. Use a future debit-note workflow.'
        using errcode = '55000';
    end if;
    return old;
  end if;

  if old.status = 'draft' then
    if new.status not in ('draft', 'issued') then
      raise exception 'A draft supplier bill can only be issued.' using errcode = '23514';
    end if;
    return new;
  end if;

  if row(
    new.business_id,
    new.supplier_id,
    new.bill_number,
    new.bill_code,
    new.supplier_document_number,
    new.bill_date,
    new.due_date,
    new.currency,
    new.exchange_rate,
    new.subtotal_transaction,
    new.discount_transaction,
    new.tax_transaction,
    new.total_transaction,
    new.subtotal_base,
    new.discount_base,
    new.tax_base,
    new.total_base,
    new.journal_entry_id,
    new.notes,
    new.idempotency_key,
    new.created_by,
    new.issued_at,
    new.created_at
  ) is distinct from row(
    old.business_id,
    old.supplier_id,
    old.bill_number,
    old.bill_code,
    old.supplier_document_number,
    old.bill_date,
    old.due_date,
    old.currency,
    old.exchange_rate,
    old.subtotal_transaction,
    old.discount_transaction,
    old.tax_transaction,
    old.total_transaction,
    old.subtotal_base,
    old.discount_base,
    old.tax_base,
    old.total_base,
    old.journal_entry_id,
    old.notes,
    old.idempotency_key,
    old.created_by,
    old.issued_at,
    old.created_at
  ) then
    raise exception 'Issued supplier bill financial details are immutable.' using errcode = '55000';
  end if;

  if new.paid_transaction < old.paid_transaction or new.paid_base < old.paid_base then
    raise exception 'Supplier bill paid amounts cannot decrease.' using errcode = '23514';
  end if;

  if old.status = 'paid' and new.status <> 'paid' then
    raise exception 'Paid supplier bills cannot be reopened.' using errcode = '55000';
  end if;

  if new.status not in ('issued', 'partially_paid', 'paid') then
    raise exception 'Invalid supplier bill status transition.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_business_supplier_bill_state()
  from public, anon, authenticated;

create trigger business_supplier_bills_enforce_state
before update or delete on public.business_supplier_bills
for each row execute function private.enforce_business_supplier_bill_state();

create or replace function private.enforce_business_supplier_payment_state()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'posted' then
      raise exception 'Posted supplier payments cannot be deleted.' using errcode = '55000';
    end if;
    return old;
  end if;

  if old.status = 'posted' then
    raise exception 'Posted supplier payments are immutable.' using errcode = '55000';
  end if;

  if row(
    new.business_id,
    new.bill_id,
    new.payment_date,
    new.amount_transaction,
    new.amount_base,
    new.payment_account_id,
    new.reference,
    new.idempotency_key,
    new.created_by,
    new.created_at
  ) is distinct from row(
    old.business_id,
    old.bill_id,
    old.payment_date,
    old.amount_transaction,
    old.amount_base,
    old.payment_account_id,
    old.reference,
    old.idempotency_key,
    old.created_by,
    old.created_at
  ) then
    raise exception 'Supplier payment financial details are immutable.' using errcode = '55000';
  end if;

  if new.status <> 'posted' then
    raise exception 'A draft supplier payment can only be posted.' using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke execute on function private.enforce_business_supplier_payment_state()
  from public, anon, authenticated;

create trigger business_supplier_payments_enforce_state
before update or delete on public.business_supplier_payments
for each row execute function private.enforce_business_supplier_payment_state();

insert into public.business_purchase_settings (business_id)
select business.id
from public.businesses business
where business.status = 'active'
on conflict (business_id) do nothing;

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
select
  business.id,
  '1350',
  'Recoverable taxes',
  'asset',
  'tax_receivable',
  'debit',
  'tax_recoverable',
  false,
  business.owner_user_id
from public.businesses business
where business.status = 'active'
on conflict (business_id, code) do update
set name = excluded.name,
    account_type = excluded.account_type,
    account_subtype = excluded.account_subtype,
    normal_balance = excluded.normal_balance,
    system_key = excluded.system_key,
    allow_manual_posting = excluded.allow_manual_posting,
    updated_at = now();

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

  insert into public.business_purchase_settings (business_id)
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
    (p_business_id, '1350', 'Recoverable taxes', 'asset', 'tax_receivable', 'debit', 'tax_recoverable', false, p_owner_id),
    (p_business_id, '1400', 'Prepaid expenses', 'asset', 'prepaid', 'debit', 'prepaid_expenses', true, p_owner_id),
    (p_business_id, '1500', 'Property, plant and equipment', 'asset', 'fixed_asset', 'debit', 'fixed_assets', true, p_owner_id),
    (p_business_id, '2000', 'Accounts payable', 'liability', 'payable', 'credit', 'accounts_payable', false, p_owner_id),
    (p_business_id, '2100', 'Taxes payable', 'liability', 'tax', 'credit', 'taxes_payable', false, p_owner_id),
    (p_business_id, '2200', 'Accrued expenses', 'liability', 'accrual', 'credit', 'accrued_expenses', true, p_owner_id),
    (p_business_id, '2300', 'Loans payable', 'liability', 'loan', 'credit', 'loans_payable', true, p_owner_id),
    (p_business_id, '3000', 'Owner capital', 'equity', 'capital', 'credit', 'owner_capital', true, p_owner_id),
    (p_business_id, '3100', 'Owner drawings', 'equity', 'drawings', 'debit', 'owner_drawings', true, p_owner_id),
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
  on conflict (business_id, code) do update
  set name = excluded.name,
      account_type = excluded.account_type,
      account_subtype = excluded.account_subtype,
      normal_balance = excluded.normal_balance,
      system_key = excluded.system_key,
      allow_manual_posting = excluded.allow_manual_posting,
      updated_at = now();
end;
$$;

revoke execute on function private.initialize_business_accounting(uuid, uuid)
  from public, anon, authenticated;

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
  entry_source_type text;
  entry_source_id uuid;
  entry_exchange_rate numeric(24, 10);
  rounding_scale smallint;
  account_valid boolean;
  account_system_key text;
  account_type text;
  invoice_total_base numeric(24, 6);
  invoice_tax_base numeric(24, 6);
  invoice_revenue_base numeric(24, 6);
  invoice_revenue_and_tax_base numeric(24, 6);
  first_revenue_account_id uuid;
  sales_payment_base numeric(24, 6);
  supplier_bill_total_base numeric(24, 6);
  supplier_bill_tax_base numeric(24, 6);
  supplier_bill_allocation_base numeric(24, 6);
  supplier_payment_base numeric(24, 6);
begin
  target_entry_id := case
    when tg_op = 'DELETE' then old.journal_entry_id
    else new.journal_entry_id
  end;

  select
    entry.business_id,
    entry.status,
    entry.source_type,
    entry.source_id,
    entry.exchange_rate
  into
    entry_business_id,
    entry_status,
    entry_source_type,
    entry_source_id,
    entry_exchange_rate
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

  select
    account.system_key,
    account.account_type,
    (
      account.is_active
      and (
        (entry_source_type = 'manual' and account.allow_manual_posting)
        or (
          entry_source_type = 'sales_invoice'
          and account.system_key in (
            'accounts_receivable',
            'sales_revenue',
            'service_revenue',
            'taxes_payable'
          )
        )
        or (
          entry_source_type = 'sales_payment'
          and account.system_key in ('cash', 'bank', 'accounts_receivable')
        )
        or (
          entry_source_type = 'purchase_bill'
          and (
            account.system_key in ('accounts_payable', 'tax_recoverable')
            or account.account_type = 'expense'
            or (
              account.account_type = 'asset'
              and account.system_key in ('inventory', 'prepaid_expenses', 'fixed_assets')
            )
          )
        )
        or (
          entry_source_type = 'supplier_payment'
          and account.system_key in ('cash', 'bank', 'accounts_payable')
        )
      )
    )
  into account_system_key, account_type, account_valid
  from public.business_chart_of_accounts account
  where account.id = new.account_id
    and account.business_id = new.business_id;

  if not coalesce(account_valid, false) then
    raise exception 'Account is inactive, restricted, or invalid for this journal source.'
      using errcode = '23514';
  end if;

  select settings.rounding_scale
  into rounding_scale
  from public.business_accounting_settings settings
  where settings.business_id = new.business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if entry_source_type = 'manual' then
    new.debit_base := round(new.debit_transaction * entry_exchange_rate, rounding_scale);
    new.credit_base := round(new.credit_transaction * entry_exchange_rate, rounding_scale);
    return new;
  end if;

  if entry_source_type = 'sales_invoice' then
    select invoice.total_base, invoice.tax_base
    into invoice_total_base, invoice_tax_base
    from public.business_sales_invoices invoice
    where invoice.id = entry_source_id
      and invoice.business_id = new.business_id
      and invoice.status = 'draft';

    if invoice_total_base is null then
      raise exception 'Sales invoice accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key = 'accounts_receivable' then
      new.debit_base := invoice_total_base;
      new.credit_base := 0;
      return new;
    end if;

    if account_system_key = 'taxes_payable' then
      new.debit_base := 0;
      new.credit_base := invoice_tax_base;
      return new;
    end if;

    select
      coalesce(sum(line.net_base) filter (where line.revenue_account_id = new.account_id), 0),
      coalesce(sum(line.net_base), 0) + invoice_tax_base,
      min(line.revenue_account_id::text)::uuid
    into
      invoice_revenue_base,
      invoice_revenue_and_tax_base,
      first_revenue_account_id
    from public.business_sales_invoice_lines line
    where line.business_id = new.business_id
      and line.invoice_id = entry_source_id;

    if new.account_id = first_revenue_account_id then
      invoice_revenue_base := invoice_revenue_base
        + (invoice_total_base - invoice_revenue_and_tax_base);
    end if;

    new.debit_base := 0;
    new.credit_base := invoice_revenue_base;
    return new;
  end if;

  if entry_source_type = 'sales_payment' then
    select payment.amount_base
    into sales_payment_base
    from public.business_sales_payments payment
    where payment.id = entry_source_id
      and payment.business_id = new.business_id
      and payment.status = 'draft';

    if sales_payment_base is null then
      raise exception 'Sales payment accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key in ('cash', 'bank') then
      new.debit_base := sales_payment_base;
      new.credit_base := 0;
    else
      new.debit_base := 0;
      new.credit_base := sales_payment_base;
    end if;
    return new;
  end if;

  if entry_source_type = 'purchase_bill' then
    select bill.total_base, bill.tax_base
    into supplier_bill_total_base, supplier_bill_tax_base
    from public.business_supplier_bills bill
    where bill.id = entry_source_id
      and bill.business_id = new.business_id
      and bill.status = 'draft';

    if supplier_bill_total_base is null then
      raise exception 'Supplier bill accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key = 'accounts_payable' then
      new.debit_base := 0;
      new.credit_base := supplier_bill_total_base;
      return new;
    end if;

    if account_system_key = 'tax_recoverable' then
      new.debit_base := supplier_bill_tax_base;
      new.credit_base := 0;
      return new;
    end if;

    select coalesce(sum(line.net_base), 0)
    into supplier_bill_allocation_base
    from public.business_supplier_bill_lines line
    where line.business_id = new.business_id
      and line.bill_id = entry_source_id
      and line.allocation_account_id = new.account_id;

    new.debit_base := supplier_bill_allocation_base;
    new.credit_base := 0;
    return new;
  end if;

  if entry_source_type = 'supplier_payment' then
    select payment.amount_base
    into supplier_payment_base
    from public.business_supplier_payments payment
    where payment.id = entry_source_id
      and payment.business_id = new.business_id
      and payment.status = 'draft';

    if supplier_payment_base is null then
      raise exception 'Supplier payment accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key = 'accounts_payable' then
      new.debit_base := supplier_payment_base;
      new.credit_base := 0;
    else
      new.debit_base := 0;
      new.credit_base := supplier_payment_base;
    end if;
    return new;
  end if;

  raise exception 'Unsupported journal source.' using errcode = '22023';
end;
$$;

revoke execute on function private.prepare_business_journal_line()
  from public, anon, authenticated;

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
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  business_base_currency text;
  normalized_currency text;
  normalized_source_type text := lower(btrim(coalesce(p_source_type, 'manual')));
  selected_period_id uuid;
  created_entry_id uuid;
  effective_lines jsonb := p_lines;
  line_item jsonb;
  account_uuid uuid;
  debit_amount numeric(24, 6);
  credit_amount numeric(24, 6);
  line_description text;
  line_number smallint := 0;
  ar_account_id uuid;
  ap_account_id uuid;
  tax_account_id uuid;
  payment_account_id uuid;
  sales_invoice_total numeric(24, 6);
  sales_invoice_tax numeric(24, 6);
  sales_payment_amount numeric(24, 6);
  supplier_bill_total numeric(24, 6);
  supplier_bill_tax numeric(24, 6);
  supplier_payment_amount numeric(24, 6);
  accounting_basis text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if normalized_source_type = 'manual' then
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
  elsif normalized_source_type in ('sales_invoice', 'sales_payment') then
    if not exists (
      select 1
      from public.business_members membership
      where membership.business_id = p_business_id
        and membership.user_id = current_user_id
        and membership.status = 'active'
        and (
          membership.role in ('owner', 'admin', 'accountant', 'manager', 'sales', 'cashier')
          or '*' = any(membership.permissions)
          or 'sales.manage' = any(membership.permissions)
          or 'sales.collect' = any(membership.permissions)
        )
    ) then
      raise exception 'Sales permission required.' using errcode = '42501';
    end if;
  elsif normalized_source_type in ('purchase_bill', 'supplier_payment') then
    if not exists (
      select 1
      from public.business_members membership
      where membership.business_id = p_business_id
        and membership.user_id = current_user_id
        and membership.status = 'active'
        and (
          membership.role in ('owner', 'admin', 'accountant', 'manager')
          or '*' = any(membership.permissions)
          or 'purchases.manage' = any(membership.permissions)
          or 'purchases.pay' = any(membership.permissions)
        )
    ) then
      raise exception 'Purchasing permission required.' using errcode = '42501';
    end if;
  else
    raise exception 'Unsupported journal source.' using errcode = '22023';
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

  select settings.accounting_basis
  into accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if accounting_basis is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if normalized_source_type = 'sales_invoice' then
    if accounting_basis <> 'accrual' then
      raise exception 'Sales invoice posting currently requires accrual accounting.'
        using errcode = '0A000';
    end if;

    select invoice.total_transaction, invoice.tax_transaction
    into sales_invoice_total, sales_invoice_tax
    from public.business_sales_invoices invoice
    where invoice.id = p_source_id
      and invoice.business_id = p_business_id
      and invoice.status = 'draft'
      and invoice.journal_entry_id is null
      and invoice.currency = normalized_currency
      and invoice.exchange_rate = p_exchange_rate
    for update;

    if not found then
      raise exception 'Draft sales invoice is unavailable for posting.' using errcode = 'P0002';
    end if;

    select account.id
    into ar_account_id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.system_key = 'accounts_receivable'
      and account.is_active;

    if ar_account_id is null then
      raise exception 'Accounts receivable account is missing.' using errcode = '23503';
    end if;

    effective_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', ar_account_id,
        'debit', sales_invoice_total,
        'credit', 0,
        'description', 'Accounts receivable'
      )
    );

    select effective_lines || coalesce(jsonb_agg(
      jsonb_build_object(
        'account_id', grouped.revenue_account_id,
        'debit', 0,
        'credit', grouped.revenue_amount,
        'description', 'Invoice revenue'
      ) order by grouped.revenue_account_id
    ), '[]'::jsonb)
    into effective_lines
    from (
      select line.revenue_account_id, sum(line.net_transaction)::numeric(24, 6) as revenue_amount
      from public.business_sales_invoice_lines line
      where line.business_id = p_business_id
        and line.invoice_id = p_source_id
      group by line.revenue_account_id
    ) grouped;

    if sales_invoice_tax > 0 then
      select account.id
      into tax_account_id
      from public.business_chart_of_accounts account
      where account.business_id = p_business_id
        and account.system_key = 'taxes_payable'
        and account.is_active;

      if tax_account_id is null then
        raise exception 'Taxes payable account is missing.' using errcode = '23503';
      end if;

      effective_lines := effective_lines || jsonb_build_array(
        jsonb_build_object(
          'account_id', tax_account_id,
          'debit', 0,
          'credit', sales_invoice_tax,
          'description', 'Invoice tax payable'
        )
      );
    end if;
  elsif normalized_source_type = 'sales_payment' then
    if accounting_basis <> 'accrual' then
      raise exception 'Sales payment posting currently requires accrual accounting.'
        using errcode = '0A000';
    end if;

    select payment.amount_transaction, payment.payment_account_id
    into sales_payment_amount, payment_account_id
    from public.business_sales_payments payment
    join public.business_sales_invoices invoice
      on invoice.business_id = payment.business_id
      and invoice.id = payment.invoice_id
    where payment.id = p_source_id
      and payment.business_id = p_business_id
      and payment.status = 'draft'
      and payment.journal_entry_id is null
      and invoice.currency = normalized_currency
      and invoice.exchange_rate = p_exchange_rate
    for update of payment;

    if not found then
      raise exception 'Draft sales payment is unavailable for posting.' using errcode = 'P0002';
    end if;

    select account.id
    into ar_account_id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.system_key = 'accounts_receivable'
      and account.is_active;

    if ar_account_id is null then
      raise exception 'Accounts receivable account is missing.' using errcode = '23503';
    end if;

    effective_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', payment_account_id,
        'debit', sales_payment_amount,
        'credit', 0,
        'description', 'Cash or bank receipt'
      ),
      jsonb_build_object(
        'account_id', ar_account_id,
        'debit', 0,
        'credit', sales_payment_amount,
        'description', 'Accounts receivable settlement'
      )
    );
  elsif normalized_source_type = 'purchase_bill' then
    if accounting_basis <> 'accrual' then
      raise exception 'Supplier bill posting currently requires accrual accounting.'
        using errcode = '0A000';
    end if;

    select bill.total_transaction, bill.tax_transaction
    into supplier_bill_total, supplier_bill_tax
    from public.business_supplier_bills bill
    where bill.id = p_source_id
      and bill.business_id = p_business_id
      and bill.status = 'draft'
      and bill.journal_entry_id is null
      and bill.currency = normalized_currency
      and bill.exchange_rate = p_exchange_rate
    for update;

    if not found then
      raise exception 'Draft supplier bill is unavailable for posting.' using errcode = 'P0002';
    end if;

    select account.id
    into ap_account_id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.system_key = 'accounts_payable'
      and account.is_active;

    if ap_account_id is null then
      raise exception 'Accounts payable account is missing.' using errcode = '23503';
    end if;

    select coalesce(jsonb_agg(
      jsonb_build_object(
        'account_id', grouped.allocation_account_id,
        'debit', grouped.allocation_amount,
        'credit', 0,
        'description', 'Supplier bill allocation'
      ) order by grouped.allocation_account_id
    ), '[]'::jsonb)
    into effective_lines
    from (
      select
        line.allocation_account_id,
        sum(line.net_transaction)::numeric(24, 6) as allocation_amount
      from public.business_supplier_bill_lines line
      where line.business_id = p_business_id
        and line.bill_id = p_source_id
      group by line.allocation_account_id
    ) grouped;

    if supplier_bill_tax > 0 then
      select account.id
      into tax_account_id
      from public.business_chart_of_accounts account
      where account.business_id = p_business_id
        and account.system_key = 'tax_recoverable'
        and account.is_active;

      if tax_account_id is null then
        raise exception 'Recoverable tax account is missing.' using errcode = '23503';
      end if;

      effective_lines := effective_lines || jsonb_build_array(
        jsonb_build_object(
          'account_id', tax_account_id,
          'debit', supplier_bill_tax,
          'credit', 0,
          'description', 'Recoverable purchase tax'
        )
      );
    end if;

    effective_lines := effective_lines || jsonb_build_array(
      jsonb_build_object(
        'account_id', ap_account_id,
        'debit', 0,
        'credit', supplier_bill_total,
        'description', 'Accounts payable'
      )
    );
  elsif normalized_source_type = 'supplier_payment' then
    if accounting_basis <> 'accrual' then
      raise exception 'Supplier payment posting currently requires accrual accounting.'
        using errcode = '0A000';
    end if;

    select payment.amount_transaction, payment.payment_account_id
    into supplier_payment_amount, payment_account_id
    from public.business_supplier_payments payment
    join public.business_supplier_bills bill
      on bill.business_id = payment.business_id
      and bill.id = payment.bill_id
    where payment.id = p_source_id
      and payment.business_id = p_business_id
      and payment.status = 'draft'
      and payment.journal_entry_id is null
      and bill.currency = normalized_currency
      and bill.exchange_rate = p_exchange_rate
    for update of payment;

    if not found then
      raise exception 'Draft supplier payment is unavailable for posting.' using errcode = 'P0002';
    end if;

    select account.id
    into ap_account_id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.system_key = 'accounts_payable'
      and account.is_active;

    if ap_account_id is null then
      raise exception 'Accounts payable account is missing.' using errcode = '23503';
    end if;

    effective_lines := jsonb_build_array(
      jsonb_build_object(
        'account_id', ap_account_id,
        'debit', supplier_payment_amount,
        'credit', 0,
        'description', 'Accounts payable settlement'
      ),
      jsonb_build_object(
        'account_id', payment_account_id,
        'debit', 0,
        'credit', supplier_payment_amount,
        'description', 'Cash or bank payment'
      )
    );
  end if;

  if jsonb_typeof(effective_lines) <> 'array'
    or jsonb_array_length(effective_lines) < 2
    or jsonb_array_length(effective_lines) > 200
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
  ) values (
    p_business_id,
    p_entry_date,
    selected_period_id,
    normalized_source_type,
    p_source_id,
    nullif(btrim(coalesce(p_reference, '')), ''),
    btrim(p_description),
    'draft',
    normalized_currency,
    p_exchange_rate,
    current_user_id
  ) returning id into created_entry_id;

  for line_item in select value from jsonb_array_elements(effective_lines)
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
    ) values (
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

create or replace function private.create_business_supplier_bill_internal(
  p_business_id uuid,
  p_supplier_id uuid,
  p_bill_date date,
  p_due_date date,
  p_supplier_document_number text,
  p_currency text,
  p_exchange_rate numeric,
  p_notes text,
  p_lines jsonb,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  business_base_currency text;
  normalized_currency text;
  rounding_scale smallint;
  accounting_basis text;
  created_bill_id uuid;
  created_journal_id uuid;
  existing_bill_id uuid;
  assigned_number bigint;
  assigned_prefix text;
  assigned_code text;
  line_item jsonb;
  line_number smallint := 0;
  allocation_account_id uuid;
  line_description text;
  line_quantity numeric(24, 6);
  line_unit_cost numeric(24, 6);
  line_discount_percent numeric(9, 6);
  line_tax_rate numeric(9, 6);
  bill_subtotal_transaction numeric(24, 6);
  bill_discount_transaction numeric(24, 6);
  bill_tax_transaction numeric(24, 6);
  bill_total_transaction numeric(24, 6);
  bill_subtotal_base numeric(24, 6);
  bill_discount_base numeric(24, 6);
  bill_tax_base numeric(24, 6);
  bill_total_base numeric(24, 6);
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
        membership.role in ('owner', 'admin', 'accountant', 'manager')
        or '*' = any(membership.permissions)
        or 'purchases.manage' = any(membership.permissions)
      )
  ) then
    raise exception 'Purchasing permission required.' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select bill.id
    into existing_bill_id
    from public.business_supplier_bills bill
    where bill.business_id = p_business_id
      and bill.idempotency_key = nullif(btrim(p_idempotency_key), '');

    if existing_bill_id is not null then
      return existing_bill_id;
    end if;
  end if;

  select business.base_currency
  into business_base_currency
  from public.businesses business
  where business.id = p_business_id
    and business.status = 'active';

  if business_base_currency is null then
    raise exception 'Active business not found.' using errcode = 'P0002';
  end if;

  if not exists (
    select 1
    from public.business_contacts supplier
    where supplier.id = p_supplier_id
      and supplier.business_id = p_business_id
      and supplier.status = 'active'
      and supplier.contact_type in ('supplier', 'both')
  ) then
    raise exception 'Active supplier not found.' using errcode = 'P0002';
  end if;

  select settings.rounding_scale, settings.accounting_basis
  into rounding_scale, accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if accounting_basis <> 'accrual' then
    raise exception 'Supplier bills currently require accrual accounting.' using errcode = '0A000';
  end if;

  if p_bill_date is null or p_due_date is null or p_due_date < p_bill_date then
    raise exception 'Supplier bill and due dates are invalid.' using errcode = '22008';
  end if;

  normalized_currency := upper(btrim(coalesce(p_currency, business_base_currency)));
  if not public.is_supported_financial_currency(normalized_currency) then
    raise exception 'Unsupported supplier bill currency.' using errcode = '22023';
  end if;

  if p_exchange_rate is null or p_exchange_rate <= 0 then
    raise exception 'Exchange rate must be greater than zero.' using errcode = '22023';
  end if;

  if normalized_currency = business_base_currency and p_exchange_rate <> 1 then
    raise exception 'Base-currency supplier bills must use an exchange rate of 1.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) < 1
    or jsonb_array_length(p_lines) > 100
  then
    raise exception 'Supplier bills require 1 to 100 lines.' using errcode = '22023';
  end if;

  insert into public.business_supplier_bills (
    business_id,
    supplier_id,
    supplier_document_number,
    bill_date,
    due_date,
    status,
    currency,
    exchange_rate,
    notes,
    idempotency_key,
    created_by
  ) values (
    p_business_id,
    p_supplier_id,
    nullif(btrim(coalesce(p_supplier_document_number, '')), ''),
    p_bill_date,
    p_due_date,
    'draft',
    normalized_currency,
    p_exchange_rate,
    nullif(btrim(coalesce(p_notes, '')), ''),
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    current_user_id
  ) returning id into created_bill_id;

  for line_item in select value from jsonb_array_elements(p_lines)
  loop
    line_number := line_number + 1;

    begin
      allocation_account_id := (line_item ->> 'allocation_account_id')::uuid;
      line_quantity := coalesce(nullif(line_item ->> 'quantity', '')::numeric, 0);
      line_unit_cost := coalesce(nullif(line_item ->> 'unit_cost', '')::numeric, 0);
      line_discount_percent := coalesce(
        nullif(line_item ->> 'discount_percent', '')::numeric,
        0
      );
      line_tax_rate := coalesce(nullif(line_item ->> 'tax_rate', '')::numeric, 0);
    exception
      when invalid_text_representation then
        raise exception 'Every supplier bill line requires valid account and numeric values.'
          using errcode = '22023';
    end;

    line_description := btrim(coalesce(line_item ->> 'description', ''));

    if char_length(line_description) < 2
      or line_quantity <= 0
      or line_unit_cost < 0
      or line_discount_percent < 0
      or line_discount_percent > 100
      or line_tax_rate < 0
      or line_tax_rate > 100
    then
      raise exception 'Supplier bill line values are invalid.' using errcode = '22023';
    end if;

    insert into public.business_supplier_bill_lines (
      business_id,
      bill_id,
      line_number,
      description,
      quantity,
      unit_cost_transaction,
      discount_percent,
      tax_rate,
      allocation_account_id
    ) values (
      p_business_id,
      created_bill_id,
      line_number,
      line_description,
      line_quantity,
      line_unit_cost,
      line_discount_percent,
      line_tax_rate,
      allocation_account_id
    );
  end loop;

  select
    coalesce(sum(line.gross_transaction), 0),
    coalesce(sum(line.discount_transaction), 0),
    coalesce(sum(line.tax_transaction), 0),
    coalesce(sum(line.total_transaction), 0),
    coalesce(sum(line.gross_base), 0),
    coalesce(sum(line.discount_base), 0),
    coalesce(sum(line.tax_base), 0),
    coalesce(sum(line.total_base), 0)
  into
    bill_subtotal_transaction,
    bill_discount_transaction,
    bill_tax_transaction,
    bill_total_transaction,
    bill_subtotal_base,
    bill_discount_base,
    bill_tax_base,
    bill_total_base
  from public.business_supplier_bill_lines line
  where line.business_id = p_business_id
    and line.bill_id = created_bill_id;

  if bill_total_transaction <= 0 or bill_total_base <= 0 then
    raise exception 'Supplier bill total must be greater than zero.' using errcode = '22023';
  end if;

  update public.business_supplier_bills bill
  set subtotal_transaction = bill_subtotal_transaction,
      discount_transaction = bill_discount_transaction,
      tax_transaction = bill_tax_transaction,
      total_transaction = bill_total_transaction,
      subtotal_base = bill_subtotal_base,
      discount_base = bill_discount_base,
      tax_base = bill_tax_base,
      total_base = bill_total_base
  where bill.id = created_bill_id
    and bill.business_id = p_business_id;

  select settings.bill_prefix, settings.next_bill_number
  into assigned_prefix, assigned_number
  from public.business_purchase_settings settings
  where settings.business_id = p_business_id
  for update;

  if assigned_number is null then
    raise exception 'Purchase numbering settings are missing.' using errcode = '23503';
  end if;

  assigned_code := format('%s-%s', assigned_prefix, lpad(assigned_number::text, 6, '0'));

  update public.business_purchase_settings settings
  set next_bill_number = settings.next_bill_number + 1
  where settings.business_id = p_business_id;

  created_journal_id := public.post_business_journal_entry(
    p_business_id,
    p_bill_date,
    'Supplier bill ' || assigned_code,
    coalesce(nullif(btrim(coalesce(p_supplier_document_number, '')), ''), assigned_code),
    'purchase_bill',
    created_bill_id,
    normalized_currency,
    p_exchange_rate,
    '[]'::jsonb
  );

  update public.business_supplier_bills bill
  set bill_number = assigned_number,
      bill_code = assigned_code,
      journal_entry_id = created_journal_id,
      status = 'issued',
      issued_at = now()
  where bill.id = created_bill_id
    and bill.business_id = p_business_id;

  return created_bill_id;
end;
$$;

revoke execute on function private.create_business_supplier_bill_internal(
  uuid, uuid, date, date, text, text, numeric, text, jsonb, text
) from public, anon;
grant execute on function private.create_business_supplier_bill_internal(
  uuid, uuid, date, date, text, text, numeric, text, jsonb, text
) to authenticated;

grant usage on schema private to authenticated;

create or replace function public.create_business_supplier_bill(
  p_business_id uuid,
  p_supplier_id uuid,
  p_bill_date date,
  p_due_date date,
  p_supplier_document_number text default null,
  p_currency text default null,
  p_exchange_rate numeric default 1,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  return private.create_business_supplier_bill_internal(
    p_business_id,
    p_supplier_id,
    p_bill_date,
    p_due_date,
    p_supplier_document_number,
    p_currency,
    p_exchange_rate,
    p_notes,
    p_lines,
    p_idempotency_key
  );
end;
$$;

revoke execute on function public.create_business_supplier_bill(
  uuid, uuid, date, date, text, text, numeric, text, jsonb, text
) from public, anon;
grant execute on function public.create_business_supplier_bill(
  uuid, uuid, date, date, text, text, numeric, text, jsonb, text
) to authenticated;

create or replace function private.record_business_supplier_payment_internal(
  p_business_id uuid,
  p_bill_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_account_id uuid,
  p_reference text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_user_id uuid := auth.uid();
  bill_record record;
  rounding_scale smallint;
  accounting_basis text;
  payment_amount numeric(24, 6);
  payment_amount_base numeric(24, 6);
  new_paid_transaction numeric(24, 6);
  new_paid_base numeric(24, 6);
  created_payment_id uuid;
  created_journal_id uuid;
  existing_payment_id uuid;
  is_final_payment boolean;
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
        membership.role in ('owner', 'admin', 'accountant', 'manager')
        or '*' = any(membership.permissions)
        or 'purchases.manage' = any(membership.permissions)
        or 'purchases.pay' = any(membership.permissions)
      )
  ) then
    raise exception 'Supplier payment permission required.' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select payment.id
    into existing_payment_id
    from public.business_supplier_payments payment
    where payment.business_id = p_business_id
      and payment.idempotency_key = nullif(btrim(p_idempotency_key), '');

    if existing_payment_id is not null then
      return existing_payment_id;
    end if;
  end if;

  select bill.*
  into bill_record
  from public.business_supplier_bills bill
  where bill.id = p_bill_id
    and bill.business_id = p_business_id
    and bill.status in ('issued', 'partially_paid')
  for update;

  if not found then
    raise exception 'Open supplier bill not found.' using errcode = 'P0002';
  end if;

  select settings.rounding_scale, settings.accounting_basis
  into rounding_scale, accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if accounting_basis <> 'accrual' then
    raise exception 'Supplier payments currently require accrual accounting.' using errcode = '0A000';
  end if;

  if p_payment_date is null or p_payment_date < bill_record.bill_date then
    raise exception 'Supplier payment date is invalid.' using errcode = '22008';
  end if;

  payment_amount := round(coalesce(p_amount, 0), rounding_scale);
  if payment_amount <= 0
    or payment_amount > bill_record.total_transaction - bill_record.paid_transaction
  then
    raise exception 'Payment must be positive and cannot exceed the outstanding payable.'
      using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.business_chart_of_accounts account
    where account.id = p_payment_account_id
      and account.business_id = p_business_id
      and account.is_active
      and account.system_key in ('cash', 'bank')
  ) then
    raise exception 'Payment account must be an active cash or bank account.'
      using errcode = '23514';
  end if;

  is_final_payment := payment_amount
    = bill_record.total_transaction - bill_record.paid_transaction;

  payment_amount_base := case
    when is_final_payment then bill_record.total_base - bill_record.paid_base
    else round(payment_amount * bill_record.exchange_rate, rounding_scale)
  end;

  if payment_amount_base <= 0 then
    raise exception 'Calculated base-currency supplier payment is invalid.' using errcode = '22023';
  end if;

  insert into public.business_supplier_payments (
    business_id,
    bill_id,
    payment_date,
    amount_transaction,
    amount_base,
    payment_account_id,
    reference,
    idempotency_key,
    status,
    created_by
  ) values (
    p_business_id,
    p_bill_id,
    p_payment_date,
    payment_amount,
    payment_amount_base,
    p_payment_account_id,
    nullif(btrim(coalesce(p_reference, '')), ''),
    nullif(btrim(coalesce(p_idempotency_key, '')), ''),
    'draft',
    current_user_id
  ) returning id into created_payment_id;

  created_journal_id := public.post_business_journal_entry(
    p_business_id,
    p_payment_date,
    'Payment made for ' || bill_record.bill_code,
    nullif(btrim(coalesce(p_reference, bill_record.bill_code)), ''),
    'supplier_payment',
    created_payment_id,
    bill_record.currency,
    bill_record.exchange_rate,
    '[]'::jsonb
  );

  update public.business_supplier_payments payment
  set status = 'posted',
      journal_entry_id = created_journal_id,
      posted_at = now()
  where payment.id = created_payment_id
    and payment.business_id = p_business_id;

  new_paid_transaction := bill_record.paid_transaction + payment_amount;
  new_paid_base := bill_record.paid_base + payment_amount_base;

  update public.business_supplier_bills bill
  set paid_transaction = new_paid_transaction,
      paid_base = new_paid_base,
      status = case
        when new_paid_transaction = bill.total_transaction then 'paid'
        else 'partially_paid'
      end
  where bill.id = p_bill_id
    and bill.business_id = p_business_id;

  return created_payment_id;
end;
$$;

revoke execute on function private.record_business_supplier_payment_internal(
  uuid, uuid, date, numeric, uuid, text, text
) from public, anon;
grant execute on function private.record_business_supplier_payment_internal(
  uuid, uuid, date, numeric, uuid, text, text
) to authenticated;

create or replace function public.record_business_supplier_payment(
  p_business_id uuid,
  p_bill_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_account_id uuid,
  p_reference text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $$
begin
  return private.record_business_supplier_payment_internal(
    p_business_id,
    p_bill_id,
    p_payment_date,
    p_amount,
    p_payment_account_id,
    p_reference,
    p_idempotency_key
  );
end;
$$;

revoke execute on function public.record_business_supplier_payment(
  uuid, uuid, date, numeric, uuid, text, text
) from public, anon;
grant execute on function public.record_business_supplier_payment(
  uuid, uuid, date, numeric, uuid, text, text
) to authenticated;

alter table public.business_purchase_settings enable row level security;
alter table public.business_supplier_bills enable row level security;
alter table public.business_supplier_bill_lines enable row level security;
alter table public.business_supplier_payments enable row level security;

revoke all privileges on table
  public.business_purchase_settings,
  public.business_supplier_bills,
  public.business_supplier_bill_lines,
  public.business_supplier_payments
from anon, authenticated;

grant select on table
  public.business_purchase_settings,
  public.business_supplier_bills,
  public.business_supplier_bill_lines,
  public.business_supplier_payments
to authenticated;

grant select, insert, update, delete on table
  public.business_purchase_settings,
  public.business_supplier_bills,
  public.business_supplier_bill_lines,
  public.business_supplier_payments
to service_role;

create policy business_purchase_settings_select_member
on public.business_purchase_settings
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_supplier_bills_select_member
on public.business_supplier_bills
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_supplier_bill_lines_select_member
on public.business_supplier_bill_lines
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy business_supplier_payments_select_member
on public.business_supplier_payments
for select to authenticated
using (
  business_id in (
    select membership.business_id
    from public.business_members membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create or replace view public.business_accounts_payable
with (security_invoker = true)
as
select
  bill.business_id,
  bill.id as bill_id,
  bill.supplier_id,
  bill.bill_code,
  bill.supplier_document_number,
  bill.bill_date,
  bill.due_date,
  bill.status,
  bill.currency,
  bill.exchange_rate,
  bill.total_transaction,
  bill.paid_transaction,
  (bill.total_transaction - bill.paid_transaction)::numeric(24, 6) as outstanding_transaction,
  bill.total_base,
  bill.paid_base,
  (bill.total_base - bill.paid_base)::numeric(24, 6) as outstanding_base,
  case
    when bill.status <> 'paid' and bill.due_date < current_date
      then current_date - bill.due_date
    else 0
  end as days_overdue
from public.business_supplier_bills bill
where bill.status in ('issued', 'partially_paid', 'paid');

revoke all privileges on table public.business_accounts_payable from anon, authenticated;
grant select on table public.business_accounts_payable to authenticated, service_role;

comment on table public.business_supplier_bills is
  'Tenant-scoped supplier bills posted atomically to Accounts Payable.';
comment on table public.business_supplier_bill_lines is
  'Server-calculated supplier bill allocations to expenses, inventory, prepaids, or fixed assets.';
comment on table public.business_supplier_payments is
  'Immutable posted supplier payments that settle Accounts Payable through cash or bank.';
comment on function public.create_business_supplier_bill(
  uuid, uuid, date, date, text, text, numeric, text, jsonb, text
) is
  'Creates and issues one supplier bill with a balanced purchase journal through a private atomic gateway.';
comment on function public.record_business_supplier_payment(
  uuid, uuid, date, numeric, uuid, text, text
) is
  'Records one partial or final supplier payment and posts the Accounts Payable settlement atomically.';