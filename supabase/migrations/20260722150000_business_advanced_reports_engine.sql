-- Advanced business reporting engine.
-- All financial statements are generated from posted journals and tenant-scoped operational ledgers.

create or replace function public.get_business_reports_snapshot(
  p_business_id uuid,
  p_start_date date,
  p_end_date date,
  p_as_of_date date default null
)
returns jsonb
language plpgsql
security invoker
set search_path = 'pg_catalog', 'public'
as $function$
declare
  current_user_id uuid := auth.uid();
  report_as_of date := coalesce(p_as_of_date, p_end_date, current_date);
  base_currency text;
  business_timezone text;
  pnl_report jsonb;
  balance_sheet_report jsonb;
  cash_flow_report jsonb;
  ar_aging_report jsonb;
  ap_aging_report jsonb;
  stock_valuation_report jsonb;
  returns_report jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_business_id is null then
    raise exception 'Business is required.' using errcode = '22023';
  end if;

  if p_start_date is null or p_end_date is null or p_start_date > p_end_date then
    raise exception 'Report date range is invalid.' using errcode = '22008';
  end if;

  if report_as_of is null then
    raise exception 'Report as-of date is invalid.' using errcode = '22008';
  end if;

  if not exists (
    select 1
    from public.business_members membership
    where membership.business_id = p_business_id
      and membership.user_id = current_user_id
      and membership.status = 'active'
      and (
        membership.role in ('owner', 'admin', 'accountant', 'manager', 'viewer')
        or '*' = any(membership.permissions)
        or 'reports.view' = any(membership.permissions)
        or 'accounting.view' = any(membership.permissions)
      )
  ) then
    raise exception 'Business reporting access required.' using errcode = '42501';
  end if;

  select business.base_currency, business.timezone
  into base_currency, business_timezone
  from public.businesses business
  where business.id = p_business_id
    and business.status = 'active';

  if base_currency is null then
    raise exception 'Active business not found.' using errcode = 'P0002';
  end if;

  with account_activity as (
    select
      account.id as account_id,
      account.code,
      account.name,
      account.account_type,
      account.account_subtype,
      account.system_key,
      case
        when account.account_type = 'revenue'
          then coalesce(sum(case when entry.id is not null then line.credit_base - line.debit_base else 0 end), 0)::numeric(24,6)
        else coalesce(sum(case when entry.id is not null then line.debit_base - line.credit_base else 0 end), 0)::numeric(24,6)
      end as amount
    from public.business_chart_of_accounts account
    left join public.business_journal_lines line
      on line.business_id = account.business_id
     and line.account_id = account.id
    left join public.business_journal_entries entry
      on entry.business_id = line.business_id
     and entry.id = line.journal_entry_id
     and entry.status in ('posted', 'reversed')
     and entry.entry_date between p_start_date and p_end_date
    where account.business_id = p_business_id
      and account.account_type in ('revenue', 'expense')
    group by
      account.id,
      account.code,
      account.name,
      account.account_type,
      account.account_subtype,
      account.system_key
  ), classified as (
    select
      activity.*,
      case
        when activity.account_type = 'revenue'
          and (activity.system_key = 'other_income' or activity.account_subtype = 'other_income')
          then 'other_income'
        when activity.account_type = 'revenue' then 'revenue'
        when activity.account_type = 'expense'
          and (
            activity.system_key = 'cost_of_goods_sold'
            or activity.account_subtype = 'cost_of_sales'
          ) then 'cost_of_sales'
        when activity.account_type = 'expense'
          and (
            activity.system_key = 'other_expenses'
            or activity.account_subtype = 'other_expense'
          ) then 'other_expense'
        else 'operating_expense'
      end as section
    from account_activity activity
  ), line_payload as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'account_id', classified.account_id,
          'code', classified.code,
          'name', classified.name,
          'section', classified.section,
          'amount', classified.amount
        ) order by
          case classified.section
            when 'revenue' then 1
            when 'cost_of_sales' then 2
            when 'operating_expense' then 3
            when 'other_income' then 4
            else 5
          end,
          classified.code
      ) filter (where abs(classified.amount) > 0.000001),
      '[]'::jsonb
    ) as lines
    from classified
  ), totals as (
    select
      coalesce(sum(amount) filter (where section = 'revenue'), 0)::numeric(24,6) as revenue,
      coalesce(sum(amount) filter (where section = 'cost_of_sales'), 0)::numeric(24,6) as cost_of_sales,
      coalesce(sum(amount) filter (where section = 'operating_expense'), 0)::numeric(24,6) as operating_expenses,
      coalesce(sum(amount) filter (where section = 'other_income'), 0)::numeric(24,6) as other_income,
      coalesce(sum(amount) filter (where section = 'other_expense'), 0)::numeric(24,6) as other_expenses
    from classified
  )
  select jsonb_build_object(
    'lines', line_payload.lines,
    'revenue', totals.revenue,
    'cost_of_sales', totals.cost_of_sales,
    'gross_profit', totals.revenue - totals.cost_of_sales,
    'operating_expenses', totals.operating_expenses,
    'operating_profit', totals.revenue - totals.cost_of_sales - totals.operating_expenses,
    'other_income', totals.other_income,
    'other_expenses', totals.other_expenses,
    'net_profit', totals.revenue - totals.cost_of_sales - totals.operating_expenses + totals.other_income - totals.other_expenses
  )
  into pnl_report
  from line_payload cross join totals;

  with account_activity as (
    select
      account.id as account_id,
      account.code,
      account.name,
      account.account_type,
      account.account_subtype,
      account.system_key,
      case
        when account.account_type = 'asset'
          then coalesce(sum(case when entry.id is not null then line.debit_base - line.credit_base else 0 end), 0)::numeric(24,6)
        else coalesce(sum(case when entry.id is not null then line.credit_base - line.debit_base else 0 end), 0)::numeric(24,6)
      end as amount
    from public.business_chart_of_accounts account
    left join public.business_journal_lines line
      on line.business_id = account.business_id
     and line.account_id = account.id
    left join public.business_journal_entries entry
      on entry.business_id = line.business_id
     and entry.id = line.journal_entry_id
     and entry.status in ('posted', 'reversed')
     and entry.entry_date <= report_as_of
    where account.business_id = p_business_id
      and account.account_type in ('asset', 'liability', 'equity')
    group by
      account.id,
      account.code,
      account.name,
      account.account_type,
      account.account_subtype,
      account.system_key
  ), current_earnings as (
    select coalesce(sum(
      case
        when account.account_type = 'revenue' then line.credit_base - line.debit_base
        when account.account_type = 'expense' then -(line.debit_base - line.credit_base)
        else 0
      end
    ), 0)::numeric(24,6) as amount
    from public.business_journal_entries entry
    join public.business_journal_lines line
      on line.business_id = entry.business_id
     and line.journal_entry_id = entry.id
    join public.business_chart_of_accounts account
      on account.business_id = line.business_id
     and account.id = line.account_id
    where entry.business_id = p_business_id
      and entry.status in ('posted', 'reversed')
      and entry.entry_date <= report_as_of
      and account.account_type in ('revenue', 'expense')
  ), payload as (
    select
      coalesce(jsonb_agg(
        jsonb_build_object(
          'account_id', account_id,
          'code', code,
          'name', name,
          'account_subtype', account_subtype,
          'system_key', system_key,
          'amount', amount
        ) order by code
      ) filter (where account_type = 'asset' and abs(amount) > 0.000001), '[]'::jsonb) as assets,
      coalesce(jsonb_agg(
        jsonb_build_object(
          'account_id', account_id,
          'code', code,
          'name', name,
          'account_subtype', account_subtype,
          'system_key', system_key,
          'amount', amount
        ) order by code
      ) filter (where account_type = 'liability' and abs(amount) > 0.000001), '[]'::jsonb) as liabilities,
      coalesce(jsonb_agg(
        jsonb_build_object(
          'account_id', account_id,
          'code', code,
          'name', name,
          'account_subtype', account_subtype,
          'system_key', system_key,
          'amount', amount
        ) order by code
      ) filter (where account_type = 'equity' and abs(amount) > 0.000001), '[]'::jsonb) as equity,
      coalesce(sum(amount) filter (where account_type = 'asset'), 0)::numeric(24,6) as total_assets,
      coalesce(sum(amount) filter (where account_type = 'liability'), 0)::numeric(24,6) as total_liabilities,
      coalesce(sum(amount) filter (where account_type = 'equity'), 0)::numeric(24,6) as posted_equity
    from account_activity
  )
  select jsonb_build_object(
    'assets', payload.assets,
    'liabilities', payload.liabilities,
    'equity', payload.equity,
    'current_earnings', current_earnings.amount,
    'total_assets', payload.total_assets,
    'total_liabilities', payload.total_liabilities,
    'posted_equity', payload.posted_equity,
    'total_equity', payload.posted_equity + current_earnings.amount,
    'total_liabilities_and_equity', payload.total_liabilities + payload.posted_equity + current_earnings.amount,
    'difference', payload.total_assets - (payload.total_liabilities + payload.posted_equity + current_earnings.amount),
    'is_balanced', abs(payload.total_assets - (payload.total_liabilities + payload.posted_equity + current_earnings.amount)) < 0.01
  )
  into balance_sheet_report
  from payload cross join current_earnings;

  with cash_accounts as (
    select account.id
    from public.business_chart_of_accounts account
    where account.business_id = p_business_id
      and account.is_active
      and (
        account.system_key in ('cash', 'bank')
        or account.account_subtype in ('cash', 'bank')
      )
  ), opening_cash as (
    select coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6) as amount
    from public.business_journal_entries entry
    join public.business_journal_lines line
      on line.business_id = entry.business_id
     and line.journal_entry_id = entry.id
    where entry.business_id = p_business_id
      and entry.status in ('posted', 'reversed')
      and entry.entry_date < p_start_date
      and line.account_id in (select id from cash_accounts)
  ), closing_cash as (
    select coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6) as amount
    from public.business_journal_entries entry
    join public.business_journal_lines line
      on line.business_id = entry.business_id
     and line.journal_entry_id = entry.id
    where entry.business_id = p_business_id
      and entry.status in ('posted', 'reversed')
      and entry.entry_date <= p_end_date
      and line.account_id in (select id from cash_accounts)
  ), entry_cash as (
    select
      entry.id as journal_entry_id,
      entry.journal_number,
      entry.entry_date,
      entry.source_type,
      entry.reference,
      entry.description,
      coalesce(sum(line.debit_base - line.credit_base), 0)::numeric(24,6) as net_cash
    from public.business_journal_entries entry
    join public.business_journal_lines line
      on line.business_id = entry.business_id
     and line.journal_entry_id = entry.id
     and line.account_id in (select id from cash_accounts)
    where entry.business_id = p_business_id
      and entry.status in ('posted', 'reversed')
      and entry.entry_date between p_start_date and p_end_date
    group by
      entry.id,
      entry.journal_number,
      entry.entry_date,
      entry.source_type,
      entry.reference,
      entry.description
  ), classified as (
    select
      activity.*,
      case
        when activity.source_type in ('sales_payment', 'supplier_payment') then 'operating'
        when exists (
          select 1
          from public.business_journal_lines counterpart_line
          join public.business_chart_of_accounts counterpart_account
            on counterpart_account.business_id = counterpart_line.business_id
           and counterpart_account.id = counterpart_line.account_id
          where counterpart_line.business_id = p_business_id
            and counterpart_line.journal_entry_id = activity.journal_entry_id
            and counterpart_line.account_id not in (select id from cash_accounts)
            and (
              counterpart_account.system_key = 'fixed_assets'
              or counterpart_account.account_subtype = 'fixed_asset'
            )
        ) then 'investing'
        when exists (
          select 1
          from public.business_journal_lines counterpart_line
          join public.business_chart_of_accounts counterpart_account
            on counterpart_account.business_id = counterpart_line.business_id
           and counterpart_account.id = counterpart_line.account_id
          where counterpart_line.business_id = p_business_id
            and counterpart_line.journal_entry_id = activity.journal_entry_id
            and counterpart_line.account_id not in (select id from cash_accounts)
            and (
              counterpart_account.system_key in ('loans_payable', 'owner_capital', 'owner_drawings')
              or counterpart_account.account_subtype in ('loan', 'capital', 'drawings')
            )
        ) then 'financing'
        else 'operating'
      end as category
    from entry_cash activity
    where abs(activity.net_cash) > 0.000001
  ), payload as (
    select
      coalesce(jsonb_agg(
        jsonb_build_object(
          'journal_entry_id', journal_entry_id,
          'journal_number', journal_number,
          'entry_date', entry_date,
          'source_type', source_type,
          'reference', reference,
          'description', description,
          'category', category,
          'amount', net_cash
        ) order by entry_date desc, journal_number desc nulls last
      ), '[]'::jsonb) as transactions,
      coalesce(sum(net_cash) filter (where category = 'operating'), 0)::numeric(24,6) as operating_net,
      coalesce(sum(net_cash) filter (where category = 'investing'), 0)::numeric(24,6) as investing_net,
      coalesce(sum(net_cash) filter (where category = 'financing'), 0)::numeric(24,6) as financing_net,
      coalesce(sum(net_cash) filter (where net_cash > 0), 0)::numeric(24,6) as total_inflows,
      coalesce(-sum(net_cash) filter (where net_cash < 0), 0)::numeric(24,6) as total_outflows,
      coalesce(sum(net_cash), 0)::numeric(24,6) as net_change
    from classified
  )
  select jsonb_build_object(
    'transactions', payload.transactions,
    'opening_cash', opening_cash.amount,
    'operating_net', payload.operating_net,
    'investing_net', payload.investing_net,
    'financing_net', payload.financing_net,
    'total_inflows', payload.total_inflows,
    'total_outflows', payload.total_outflows,
    'net_change', payload.net_change,
    'closing_cash', closing_cash.amount,
    'reconciles', abs((opening_cash.amount + payload.net_change) - closing_cash.amount) < 0.01
  )
  into cash_flow_report
  from payload cross join opening_cash cross join closing_cash;

  with payment_totals as (
    select payment.invoice_id, sum(payment.amount_base)::numeric(24,6) as paid_base
    from public.business_sales_payments payment
    where payment.business_id = p_business_id
      and payment.status = 'posted'
      and payment.payment_date <= report_as_of
    group by payment.invoice_id
  ), return_totals as (
    select sales_return.invoice_id, sum(sales_return.total_base)::numeric(24,6) as returned_base
    from public.business_sales_returns sales_return
    where sales_return.business_id = p_business_id
      and sales_return.status = 'posted'
      and sales_return.return_date <= report_as_of
    group by sales_return.invoice_id
  ), open_items as (
    select
      invoice.id,
      invoice.invoice_code,
      invoice.invoice_date,
      invoice.due_date,
      invoice.customer_id,
      contact.display_name as customer_name,
      invoice.currency,
      invoice.total_base,
      coalesce(payment_totals.paid_base, 0)::numeric(24,6) as paid_base,
      coalesce(return_totals.returned_base, 0)::numeric(24,6) as returned_base,
      greatest(
        invoice.total_base - coalesce(payment_totals.paid_base, 0) - coalesce(return_totals.returned_base, 0),
        0
      )::numeric(24,6) as outstanding_base,
      greatest(report_as_of - invoice.due_date, 0) as days_overdue
    from public.business_sales_invoices invoice
    join public.business_contacts contact
      on contact.business_id = invoice.business_id
     and contact.id = invoice.customer_id
    left join payment_totals on payment_totals.invoice_id = invoice.id
    left join return_totals on return_totals.invoice_id = invoice.id
    where invoice.business_id = p_business_id
      and invoice.invoice_date <= report_as_of
      and invoice.status in ('issued', 'partially_paid', 'paid')
  ), filtered as (
    select *,
      case
        when due_date >= report_as_of then 'current'
        when days_overdue <= 30 then '1_30'
        when days_overdue <= 60 then '31_60'
        when days_overdue <= 90 then '61_90'
        else '90_plus'
      end as bucket
    from open_items
    where outstanding_base > 0.000001
  ), customer_summary as (
    select
      customer_id,
      customer_name,
      sum(outstanding_base)::numeric(24,6) as outstanding_base,
      sum(outstanding_base) filter (where bucket = 'current')::numeric(24,6) as current_amount,
      sum(outstanding_base) filter (where bucket = '1_30')::numeric(24,6) as amount_1_30,
      sum(outstanding_base) filter (where bucket = '31_60')::numeric(24,6) as amount_31_60,
      sum(outstanding_base) filter (where bucket = '61_90')::numeric(24,6) as amount_61_90,
      sum(outstanding_base) filter (where bucket = '90_plus')::numeric(24,6) as amount_90_plus
    from filtered
    group by customer_id, customer_name
  ), payload as (
    select
      coalesce((select jsonb_agg(jsonb_build_object(
        'invoice_id', id,
        'invoice_code', invoice_code,
        'invoice_date', invoice_date,
        'due_date', due_date,
        'customer_id', customer_id,
        'customer_name', customer_name,
        'currency', currency,
        'total_base', total_base,
        'paid_base', paid_base,
        'returned_base', returned_base,
        'outstanding_base', outstanding_base,
        'days_overdue', days_overdue,
        'bucket', bucket
      ) order by due_date, invoice_code) from filtered), '[]'::jsonb) as items,
      coalesce((select jsonb_agg(jsonb_build_object(
        'customer_id', customer_id,
        'customer_name', customer_name,
        'outstanding_base', outstanding_base,
        'current', coalesce(current_amount,0),
        '1_30', coalesce(amount_1_30,0),
        '31_60', coalesce(amount_31_60,0),
        '61_90', coalesce(amount_61_90,0),
        '90_plus', coalesce(amount_90_plus,0)
      ) order by outstanding_base desc, customer_name) from customer_summary), '[]'::jsonb) as customers,
      coalesce((select sum(outstanding_base) from filtered),0)::numeric(24,6) as total,
      coalesce((select sum(outstanding_base) from filtered where bucket='current'),0)::numeric(24,6) as current_amount,
      coalesce((select sum(outstanding_base) from filtered where bucket='1_30'),0)::numeric(24,6) as amount_1_30,
      coalesce((select sum(outstanding_base) from filtered where bucket='31_60'),0)::numeric(24,6) as amount_31_60,
      coalesce((select sum(outstanding_base) from filtered where bucket='61_90'),0)::numeric(24,6) as amount_61_90,
      coalesce((select sum(outstanding_base) from filtered where bucket='90_plus'),0)::numeric(24,6) as amount_90_plus
  )
  select jsonb_build_object(
    'items', items,
    'customers', customers,
    'total', total,
    'current', current_amount,
    '1_30', amount_1_30,
    '31_60', amount_31_60,
    '61_90', amount_61_90,
    '90_plus', amount_90_plus
  ) into ar_aging_report
  from payload;

  with payment_totals as (
    select payment.bill_id, sum(payment.amount_base)::numeric(24,6) as paid_base
    from public.business_supplier_payments payment
    where payment.business_id = p_business_id
      and payment.status = 'posted'
      and payment.payment_date <= report_as_of
    group by payment.bill_id
  ), return_totals as (
    select purchase_return.bill_id, sum(purchase_return.total_base)::numeric(24,6) as returned_base
    from public.business_purchase_returns purchase_return
    where purchase_return.business_id = p_business_id
      and purchase_return.status = 'posted'
      and purchase_return.return_date <= report_as_of
    group by purchase_return.bill_id
  ), open_items as (
    select
      bill.id,
      bill.bill_code,
      bill.supplier_document_number,
      bill.bill_date,
      bill.due_date,
      bill.supplier_id,
      contact.display_name as supplier_name,
      bill.currency,
      bill.total_base,
      coalesce(payment_totals.paid_base, 0)::numeric(24,6) as paid_base,
      coalesce(return_totals.returned_base, 0)::numeric(24,6) as returned_base,
      greatest(
        bill.total_base - coalesce(payment_totals.paid_base, 0) - coalesce(return_totals.returned_base, 0),
        0
      )::numeric(24,6) as outstanding_base,
      greatest(report_as_of - bill.due_date, 0) as days_overdue
    from public.business_supplier_bills bill
    join public.business_contacts contact
      on contact.business_id = bill.business_id
     and contact.id = bill.supplier_id
    left join payment_totals on payment_totals.bill_id = bill.id
    left join return_totals on return_totals.bill_id = bill.id
    where bill.business_id = p_business_id
      and bill.bill_date <= report_as_of
      and bill.status in ('issued', 'partially_paid', 'paid')
  ), filtered as (
    select *,
      case
        when due_date >= report_as_of then 'current'
        when days_overdue <= 30 then '1_30'
        when days_overdue <= 60 then '31_60'
        when days_overdue <= 90 then '61_90'
        else '90_plus'
      end as bucket
    from open_items
    where outstanding_base > 0.000001
  ), supplier_summary as (
    select
      supplier_id,
      supplier_name,
      sum(outstanding_base)::numeric(24,6) as outstanding_base,
      sum(outstanding_base) filter (where bucket = 'current')::numeric(24,6) as current_amount,
      sum(outstanding_base) filter (where bucket = '1_30')::numeric(24,6) as amount_1_30,
      sum(outstanding_base) filter (where bucket = '31_60')::numeric(24,6) as amount_31_60,
      sum(outstanding_base) filter (where bucket = '61_90')::numeric(24,6) as amount_61_90,
      sum(outstanding_base) filter (where bucket = '90_plus')::numeric(24,6) as amount_90_plus
    from filtered
    group by supplier_id, supplier_name
  ), payload as (
    select
      coalesce((select jsonb_agg(jsonb_build_object(
        'bill_id', id,
        'bill_code', bill_code,
        'supplier_document_number', supplier_document_number,
        'bill_date', bill_date,
        'due_date', due_date,
        'supplier_id', supplier_id,
        'supplier_name', supplier_name,
        'currency', currency,
        'total_base', total_base,
        'paid_base', paid_base,
        'returned_base', returned_base,
        'outstanding_base', outstanding_base,
        'days_overdue', days_overdue,
        'bucket', bucket
      ) order by due_date, bill_code) from filtered), '[]'::jsonb) as items,
      coalesce((select jsonb_agg(jsonb_build_object(
        'supplier_id', supplier_id,
        'supplier_name', supplier_name,
        'outstanding_base', outstanding_base,
        'current', coalesce(current_amount,0),
        '1_30', coalesce(amount_1_30,0),
        '31_60', coalesce(amount_31_60,0),
        '61_90', coalesce(amount_61_90,0),
        '90_plus', coalesce(amount_90_plus,0)
      ) order by outstanding_base desc, supplier_name) from supplier_summary), '[]'::jsonb) as suppliers,
      coalesce((select sum(outstanding_base) from filtered),0)::numeric(24,6) as total,
      coalesce((select sum(outstanding_base) from filtered where bucket='current'),0)::numeric(24,6) as current_amount,
      coalesce((select sum(outstanding_base) from filtered where bucket='1_30'),0)::numeric(24,6) as amount_1_30,
      coalesce((select sum(outstanding_base) from filtered where bucket='31_60'),0)::numeric(24,6) as amount_31_60,
      coalesce((select sum(outstanding_base) from filtered where bucket='61_90'),0)::numeric(24,6) as amount_61_90,
      coalesce((select sum(outstanding_base) from filtered where bucket='90_plus'),0)::numeric(24,6) as amount_90_plus
  )
  select jsonb_build_object(
    'items', items,
    'suppliers', suppliers,
    'total', total,
    'current', current_amount,
    '1_30', amount_1_30,
    '31_60', amount_31_60,
    '61_90', amount_61_90,
    '90_plus', amount_90_plus
  ) into ap_aging_report
  from payload;

  with signed_movements as (
    select
      movement.product_id,
      movement.warehouse_id,
      case
        when movement.movement_type in ('receipt','transfer_in','adjustment_in','sales_return')
          then movement.quantity
        else -movement.quantity
      end::numeric(24,6) as signed_quantity,
      case
        when movement.movement_type in ('receipt','transfer_in','adjustment_in','sales_return')
          then movement.total_value_base
        else -movement.total_value_base
      end::numeric(24,6) as signed_value
    from public.business_stock_movements movement
    where movement.business_id = p_business_id
      and movement.status = 'posted'
      and movement.movement_date <= report_as_of
  ), positions as (
    select
      movement.product_id,
      product.sku,
      product.name as product_name,
      product.unit_of_measure,
      movement.warehouse_id,
      warehouse.code as warehouse_code,
      warehouse.name as warehouse_name,
      sum(movement.signed_quantity)::numeric(24,6) as quantity,
      sum(movement.signed_value)::numeric(24,6) as inventory_value,
      case
        when abs(sum(movement.signed_quantity)) < 0.000001 then 0
        else round(sum(movement.signed_value) / sum(movement.signed_quantity), 6)
      end::numeric(24,6) as average_cost
    from signed_movements movement
    join public.business_products product
      on product.business_id = p_business_id
     and product.id = movement.product_id
    join public.business_warehouses warehouse
      on warehouse.business_id = p_business_id
     and warehouse.id = movement.warehouse_id
    group by
      movement.product_id,
      product.sku,
      product.name,
      product.unit_of_measure,
      movement.warehouse_id,
      warehouse.code,
      warehouse.name
    having abs(sum(movement.signed_quantity)) > 0.000001
        or abs(sum(movement.signed_value)) > 0.000001
  ), product_totals as (
    select
      product_id,
      sku,
      product_name,
      unit_of_measure,
      sum(quantity)::numeric(24,6) as quantity,
      sum(inventory_value)::numeric(24,6) as inventory_value,
      case
        when abs(sum(quantity)) < 0.000001 then 0
        else round(sum(inventory_value) / sum(quantity), 6)
      end::numeric(24,6) as average_cost
    from positions
    group by product_id, sku, product_name, unit_of_measure
  ), payload as (
    select
      coalesce((select jsonb_agg(jsonb_build_object(
        'product_id', product_id,
        'sku', sku,
        'product_name', product_name,
        'unit_of_measure', unit_of_measure,
        'warehouse_id', warehouse_id,
        'warehouse_code', warehouse_code,
        'warehouse_name', warehouse_name,
        'quantity', quantity,
        'average_cost', average_cost,
        'inventory_value', inventory_value
      ) order by product_name, warehouse_name) from positions), '[]'::jsonb) as positions,
      coalesce((select jsonb_agg(jsonb_build_object(
        'product_id', product_id,
        'sku', sku,
        'product_name', product_name,
        'unit_of_measure', unit_of_measure,
        'quantity', quantity,
        'average_cost', average_cost,
        'inventory_value', inventory_value
      ) order by inventory_value desc, product_name) from product_totals), '[]'::jsonb) as products,
      coalesce((select sum(quantity) from product_totals),0)::numeric(24,6) as total_quantity,
      coalesce((select sum(inventory_value) from product_totals),0)::numeric(24,6) as total_value
  )
  select jsonb_build_object(
    'positions', positions,
    'products', products,
    'total_quantity', total_quantity,
    'total_value', total_value
  ) into stock_valuation_report
  from payload;

  with sales_line_totals as (
    select
      line.return_id,
      coalesce(sum(line.quantity),0)::numeric(24,6) as quantity,
      coalesce(sum(line.quantity) filter (where line.restock),0)::numeric(24,6) as restocked_quantity,
      coalesce(sum(line.cogs_base) filter (where line.restock),0)::numeric(24,6) as cogs_reversed
    from public.business_sales_return_lines line
    where line.business_id = p_business_id
    group by line.return_id
  ), purchase_line_totals as (
    select
      line.return_id,
      coalesce(sum(line.quantity),0)::numeric(24,6) as quantity,
      coalesce(sum(line.inventory_value_base),0)::numeric(24,6) as inventory_value,
      coalesce(sum(line.variance_base),0)::numeric(24,6) as variance
    from public.business_purchase_return_lines line
    where line.business_id = p_business_id
    group by line.return_id
  ), sales_items as (
    select
      sales_return.id,
      sales_return.return_code,
      sales_return.return_date,
      sales_return.invoice_id,
      invoice.invoice_code,
      sales_return.customer_id,
      contact.display_name as customer_name,
      sales_return.currency,
      sales_return.net_base,
      sales_return.tax_base,
      sales_return.total_base,
      sales_return.ar_credit_base,
      sales_return.customer_credit_base,
      coalesce(sales_line_totals.quantity,0)::numeric(24,6) as quantity,
      coalesce(sales_line_totals.restocked_quantity,0)::numeric(24,6) as restocked_quantity,
      coalesce(sales_line_totals.cogs_reversed,0)::numeric(24,6) as cogs_reversed
    from public.business_sales_returns sales_return
    join public.business_sales_invoices invoice
      on invoice.business_id = sales_return.business_id
     and invoice.id = sales_return.invoice_id
    join public.business_contacts contact
      on contact.business_id = sales_return.business_id
     and contact.id = sales_return.customer_id
    left join sales_line_totals on sales_line_totals.return_id = sales_return.id
    where sales_return.business_id = p_business_id
      and sales_return.status = 'posted'
      and sales_return.return_date between p_start_date and p_end_date
  ), purchase_items as (
    select
      purchase_return.id,
      purchase_return.return_code,
      purchase_return.return_date,
      purchase_return.bill_id,
      bill.bill_code,
      purchase_return.supplier_id,
      contact.display_name as supplier_name,
      purchase_return.currency,
      purchase_return.net_base,
      purchase_return.tax_base,
      purchase_return.total_base,
      purchase_return.ap_debit_base,
      purchase_return.supplier_receivable_base,
      coalesce(purchase_line_totals.quantity,0)::numeric(24,6) as quantity,
      coalesce(purchase_line_totals.inventory_value,0)::numeric(24,6) as inventory_value,
      coalesce(purchase_line_totals.variance,0)::numeric(24,6) as variance
    from public.business_purchase_returns purchase_return
    join public.business_supplier_bills bill
      on bill.business_id = purchase_return.business_id
     and bill.id = purchase_return.bill_id
    join public.business_contacts contact
      on contact.business_id = purchase_return.business_id
     and contact.id = purchase_return.supplier_id
    left join purchase_line_totals on purchase_line_totals.return_id = purchase_return.id
    where purchase_return.business_id = p_business_id
      and purchase_return.status = 'posted'
      and purchase_return.return_date between p_start_date and p_end_date
  ), payload as (
    select
      coalesce((select jsonb_agg(jsonb_build_object(
        'return_id', id,
        'return_code', return_code,
        'return_date', return_date,
        'invoice_id', invoice_id,
        'invoice_code', invoice_code,
        'customer_id', customer_id,
        'customer_name', customer_name,
        'currency', currency,
        'net_base', net_base,
        'tax_base', tax_base,
        'total_base', total_base,
        'ar_credit_base', ar_credit_base,
        'customer_credit_base', customer_credit_base,
        'quantity', quantity,
        'restocked_quantity', restocked_quantity,
        'cogs_reversed', cogs_reversed
      ) order by return_date desc, return_code desc) from sales_items), '[]'::jsonb) as sales_returns,
      coalesce((select jsonb_agg(jsonb_build_object(
        'return_id', id,
        'return_code', return_code,
        'return_date', return_date,
        'bill_id', bill_id,
        'bill_code', bill_code,
        'supplier_id', supplier_id,
        'supplier_name', supplier_name,
        'currency', currency,
        'net_base', net_base,
        'tax_base', tax_base,
        'total_base', total_base,
        'ap_debit_base', ap_debit_base,
        'supplier_receivable_base', supplier_receivable_base,
        'quantity', quantity,
        'inventory_value', inventory_value,
        'variance', variance
      ) order by return_date desc, return_code desc) from purchase_items), '[]'::jsonb) as purchase_returns,
      coalesce((select sum(total_base) from sales_items),0)::numeric(24,6) as sales_return_total,
      coalesce((select sum(customer_credit_base) from sales_items),0)::numeric(24,6) as customer_credits,
      coalesce((select sum(ar_credit_base) from sales_items),0)::numeric(24,6) as ar_credits,
      coalesce((select sum(cogs_reversed) from sales_items),0)::numeric(24,6) as cogs_reversed,
      coalesce((select sum(total_base) from purchase_items),0)::numeric(24,6) as purchase_return_total,
      coalesce((select sum(supplier_receivable_base) from purchase_items),0)::numeric(24,6) as supplier_refund_receivable,
      coalesce((select sum(ap_debit_base) from purchase_items),0)::numeric(24,6) as ap_reductions,
      coalesce((select sum(variance) from purchase_items),0)::numeric(24,6) as purchase_variance
  )
  select jsonb_build_object(
    'sales_returns', sales_returns,
    'purchase_returns', purchase_returns,
    'sales_return_total', sales_return_total,
    'customer_credits', customer_credits,
    'ar_credits', ar_credits,
    'cogs_reversed', cogs_reversed,
    'purchase_return_total', purchase_return_total,
    'supplier_refund_receivable', supplier_refund_receivable,
    'ap_reductions', ap_reductions,
    'purchase_variance', purchase_variance
  ) into returns_report
  from payload;

  return jsonb_build_object(
    'business_id', p_business_id,
    'base_currency', base_currency,
    'timezone', business_timezone,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'as_of_date', report_as_of,
    'generated_at', now(),
    'profit_and_loss', coalesce(pnl_report, '{}'::jsonb),
    'balance_sheet', coalesce(balance_sheet_report, '{}'::jsonb),
    'cash_flow', coalesce(cash_flow_report, '{}'::jsonb),
    'ar_aging', coalesce(ar_aging_report, '{}'::jsonb),
    'ap_aging', coalesce(ap_aging_report, '{}'::jsonb),
    'stock_valuation', coalesce(stock_valuation_report, '{}'::jsonb),
    'returns_credits', coalesce(returns_report, '{}'::jsonb)
  );
end;
$function$;

revoke all on function public.get_business_reports_snapshot(uuid,date,date,date) from public;
revoke all on function public.get_business_reports_snapshot(uuid,date,date,date) from anon;
grant execute on function public.get_business_reports_snapshot(uuid,date,date,date) to authenticated;

comment on function public.get_business_reports_snapshot(uuid,date,date,date) is
  'Returns tenant-scoped advanced financial and operational reports from posted ledgers.';

-- Reporting queries use these date-leading indexes for historical as-of reconstruction.
create index if not exists business_journal_entries_reporting_idx
  on public.business_journal_entries(business_id,status,entry_date,id);
create index if not exists business_sales_payments_reporting_idx
  on public.business_sales_payments(business_id,status,payment_date,invoice_id);
create index if not exists business_supplier_payments_reporting_idx
  on public.business_supplier_payments(business_id,status,payment_date,bill_id);
create index if not exists business_sales_returns_reporting_idx
  on public.business_sales_returns(business_id,status,return_date,invoice_id);
create index if not exists business_purchase_returns_reporting_idx
  on public.business_purchase_returns(business_id,status,return_date,bill_id);
create index if not exists business_stock_movements_reporting_idx
  on public.business_stock_movements(business_id,status,movement_date,product_id,warehouse_id);

-- Reports are a core module for every advanced business workspace.
update public.businesses
set module_config = jsonb_set(coalesce(module_config,'{}'::jsonb), '{reports}', 'true'::jsonb, true),
    updated_at = now()
where workspace_mode = 'advanced_company'
  and coalesce(module_config->>'reports','false') <> 'true';