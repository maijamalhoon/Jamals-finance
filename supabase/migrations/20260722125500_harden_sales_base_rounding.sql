alter table public.business_sales_invoices
  drop constraint if exists business_sales_invoices_amounts_check;

alter table public.business_sales_invoices
  add constraint business_sales_invoices_amounts_check check (
    subtotal_transaction >= 0
    and discount_transaction >= 0
    and discount_transaction <= subtotal_transaction
    and tax_transaction >= 0
    and total_transaction = subtotal_transaction - discount_transaction + tax_transaction
    and total_transaction > 0
    and paid_transaction >= 0
    and paid_transaction <= total_transaction
    and subtotal_base >= 0
    and discount_base >= 0
    and tax_base >= 0
    and total_base > 0
    and paid_base >= 0
    and paid_base <= total_base
  );

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
  invoice_total_base numeric(24, 6);
  invoice_tax_base numeric(24, 6);
  invoice_revenue_base numeric(24, 6);
  invoice_revenue_and_tax_base numeric(24, 6);
  first_revenue_account_id uuid;
  payment_base numeric(24, 6);
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

  select account.system_key,
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
           )
         )
  into account_system_key, account_valid
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
      min(line.revenue_account_id)
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
    into payment_base
    from public.business_sales_payments payment
    where payment.id = entry_source_id
      and payment.business_id = new.business_id
      and payment.status = 'draft';

    if payment_base is null then
      raise exception 'Sales payment accounting source is unavailable.' using errcode = 'P0002';
    end if;

    if account_system_key in ('cash', 'bank') then
      new.debit_base := payment_base;
      new.credit_base := 0;
    else
      new.debit_base := 0;
      new.credit_base := payment_base;
    end if;
    return new;
  end if;

  raise exception 'Unsupported journal source.' using errcode = '22023';
end;
$$;

revoke execute on function private.prepare_business_journal_line()
  from public, anon, authenticated;

create or replace function public.record_business_sales_payment(
  p_business_id uuid,
  p_invoice_id uuid,
  p_payment_date date,
  p_amount numeric,
  p_payment_account_id uuid,
  p_reference text default null,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_user_id uuid := auth.uid();
  invoice_record record;
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
        membership.role in ('owner', 'admin', 'accountant', 'manager', 'sales', 'cashier')
        or '*' = any(membership.permissions)
        or 'sales.manage' = any(membership.permissions)
        or 'sales.collect' = any(membership.permissions)
      )
  ) then
    raise exception 'Payment collection permission required.' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    select payment.id
    into existing_payment_id
    from public.business_sales_payments payment
    where payment.business_id = p_business_id
      and payment.idempotency_key = nullif(btrim(p_idempotency_key), '');

    if existing_payment_id is not null then
      return existing_payment_id;
    end if;
  end if;

  select invoice.*
  into invoice_record
  from public.business_sales_invoices invoice
  where invoice.id = p_invoice_id
    and invoice.business_id = p_business_id
    and invoice.status in ('issued', 'partially_paid')
  for update;

  if not found then
    raise exception 'Open sales invoice not found.' using errcode = 'P0002';
  end if;

  select settings.rounding_scale, settings.accounting_basis
  into rounding_scale, accounting_basis
  from public.business_accounting_settings settings
  where settings.business_id = p_business_id;

  if rounding_scale is null then
    raise exception 'Accounting settings are missing.' using errcode = '23503';
  end if;

  if accounting_basis <> 'accrual' then
    raise exception 'Sales payments currently require accrual accounting.' using errcode = '0A000';
  end if;

  if p_payment_date is null or p_payment_date < invoice_record.invoice_date then
    raise exception 'Payment date is invalid.' using errcode = '22008';
  end if;

  payment_amount := round(coalesce(p_amount, 0), rounding_scale);
  if payment_amount <= 0
    or payment_amount > invoice_record.total_transaction - invoice_record.paid_transaction
  then
    raise exception 'Payment must be positive and cannot exceed the outstanding balance.'
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
    = invoice_record.total_transaction - invoice_record.paid_transaction;

  payment_amount_base := case
    when is_final_payment then invoice_record.total_base - invoice_record.paid_base
    else round(payment_amount * invoice_record.exchange_rate, rounding_scale)
  end;

  if payment_amount_base <= 0 then
    raise exception 'Calculated base-currency payment is invalid.' using errcode = '22023';
  end if;

  insert into public.business_sales_payments (
    business_id,
    invoice_id,
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
    p_invoice_id,
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
    'Payment received for ' || invoice_record.invoice_code,
    nullif(btrim(coalesce(p_reference, invoice_record.invoice_code)), ''),
    'sales_payment',
    created_payment_id,
    invoice_record.currency,
    invoice_record.exchange_rate,
    '[]'::jsonb
  );

  update public.business_sales_payments payment
  set status = 'posted',
      journal_entry_id = created_journal_id,
      posted_at = now()
  where payment.id = created_payment_id
    and payment.business_id = p_business_id;

  new_paid_transaction := invoice_record.paid_transaction + payment_amount;
  new_paid_base := invoice_record.paid_base + payment_amount_base;

  update public.business_sales_invoices invoice
  set paid_transaction = new_paid_transaction,
      paid_base = new_paid_base,
      status = case
        when new_paid_transaction = invoice.total_transaction then 'paid'
        else 'partially_paid'
      end
  where invoice.id = p_invoice_id
    and invoice.business_id = p_business_id;

  return created_payment_id;
end;
$$;

revoke execute on function public.record_business_sales_payment(
  uuid, uuid, date, numeric, uuid, text, text
) from public, anon;
grant execute on function public.record_business_sales_payment(
  uuid, uuid, date, numeric, uuid, text, text
) to authenticated, service_role;

comment on function private.prepare_business_journal_line() is
  'Derives immutable base-currency values for manual, invoice, and payment journal lines with deterministic rounding.';
