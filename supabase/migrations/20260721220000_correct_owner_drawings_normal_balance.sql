alter table public.business_chart_of_accounts
  drop constraint if exists business_chart_accounts_type_normal_check;

alter table public.business_chart_of_accounts
  add constraint business_chart_accounts_type_normal_check
  check (
    (account_type in ('asset', 'expense') and normal_balance = 'debit')
    or (account_type in ('liability', 'revenue') and normal_balance = 'credit')
    or (
      account_type = 'equity'
      and (
        (account_subtype = 'drawings' and normal_balance = 'debit')
        or (coalesce(account_subtype, '') <> 'drawings' and normal_balance = 'credit')
      )
    )
  );

update public.business_chart_of_accounts
set normal_balance = 'debit',
    updated_at = now()
where account_type = 'equity'
  and account_subtype = 'drawings'
  and normal_balance <> 'debit';

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

comment on constraint business_chart_accounts_type_normal_check
  on public.business_chart_of_accounts is
  'Assets and expenses carry debit normal balances; liabilities and revenue carry credit; owner drawings is debit contra-equity.';