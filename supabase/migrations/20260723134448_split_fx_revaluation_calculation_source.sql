create or replace function private.recalculate_business_fx_revaluation_run_internal(p_business_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor uuid:=auth.uid();run_record public.business_fx_revaluation_runs%rowtype;v_base text;v_scale smallint;ar_account uuid;ap_account uuid;v_count integer;v_skipped integer;v_gain numeric(24,6);v_loss numeric(24,6);
begin
  if actor is null or not private.can_revalue_business_fx(p_business_id) then raise exception 'FX revaluation permission required.' using errcode='42501';end if;
  select * into run_record from public.business_fx_revaluation_runs where business_id=p_business_id and id=p_run_id for update;
  if not found then raise exception 'FX revaluation run not found.' using errcode='P0002';end if;
  if run_record.status<>'draft' then raise exception 'Only draft FX revaluation runs can be recalculated.' using errcode='55000';end if;
  if exists(select 1 from public.business_fx_revaluation_runs where business_id=p_business_id and status='posted') then raise exception 'Reverse the active FX revaluation before recalculating another run.' using errcode='55000';end if;
  select business.base_currency,settings.rounding_scale into v_base,v_scale from public.businesses business join public.business_accounting_settings settings on settings.business_id=business.id where business.id=p_business_id and business.status='active';
  if v_base is null then raise exception 'Active business accounting settings are missing.' using errcode='23503';end if;
  select id into ar_account from public.business_chart_of_accounts where business_id=p_business_id and system_key='accounts_receivable' and is_active;
  select id into ap_account from public.business_chart_of_accounts where business_id=p_business_id and system_key='accounts_payable' and is_active;
  if ar_account is null or ap_account is null then raise exception 'Receivable or payable accounts are missing.' using errcode='23503';end if;
  delete from public.business_fx_revaluation_lines where business_id=p_business_id and revaluation_run_id=p_run_id;

  insert into public.business_fx_revaluation_lines(business_id,revaluation_run_id,exposure_type,exposure_id,exposure_code,account_id,currency,transaction_balance,carrying_base,rate_id,closing_rate,revalued_base,adjustment_base)
  select p_business_id,p_run_id,'sales_receivable',invoice.id,invoice.invoice_code,ar_account,invoice.currency,exposure.outstanding_transaction,exposure.outstanding_base,rate.rate_id,rate.rate_to_base,round(exposure.outstanding_transaction*rate.rate_to_base,v_scale),round(exposure.outstanding_transaction*rate.rate_to_base,v_scale)-exposure.outstanding_base
  from public.business_sales_invoices invoice
  cross join lateral (select (invoice.total_transaction-invoice.paid_transaction-invoice.returned_transaction)::numeric(24,6) outstanding_transaction,(invoice.total_base-invoice.paid_base-invoice.returned_base)::numeric(24,6) outstanding_base) exposure
  cross join lateral private.get_business_fx_rate_record(p_business_id,invoice.currency,run_record.closing_date) rate
  where invoice.business_id=p_business_id and invoice.status in('issued','partially_paid') and invoice.currency<>v_base and invoice.invoice_date<=run_record.closing_date and exposure.outstanding_transaction>0 and exposure.outstanding_base>=0 and round(exposure.outstanding_transaction*rate.rate_to_base,v_scale)<>exposure.outstanding_base;

  insert into public.business_fx_revaluation_lines(business_id,revaluation_run_id,exposure_type,exposure_id,exposure_code,account_id,currency,transaction_balance,carrying_base,rate_id,closing_rate,revalued_base,adjustment_base)
  select p_business_id,p_run_id,'supplier_payable',bill.id,bill.bill_code,ap_account,bill.currency,exposure.outstanding_transaction,exposure.outstanding_base,rate.rate_id,rate.rate_to_base,round(exposure.outstanding_transaction*rate.rate_to_base,v_scale),round(exposure.outstanding_transaction*rate.rate_to_base,v_scale)-exposure.outstanding_base
  from public.business_supplier_bills bill
  cross join lateral (select (bill.total_transaction-bill.paid_transaction-bill.returned_transaction)::numeric(24,6) outstanding_transaction,(bill.total_base-bill.paid_base-bill.returned_base)::numeric(24,6) outstanding_base) exposure
  cross join lateral private.get_business_fx_rate_record(p_business_id,bill.currency,run_record.closing_date) rate
  where bill.business_id=p_business_id and bill.status in('issued','partially_paid') and bill.currency<>v_base and bill.bill_date<=run_record.closing_date and exposure.outstanding_transaction>0 and exposure.outstanding_base>=0 and round(exposure.outstanding_transaction*rate.rate_to_base,v_scale)<>exposure.outstanding_base;

  with bank_exposure as (
    select bank.id,bank.name,bank.ledger_account_id,bank.currency,
      (bank.opening_balance_transaction+coalesce(sum(case when entry.transaction_currency=bank.currency then line.debit_transaction-line.credit_transaction else 0 end),0))::numeric(24,6) transaction_balance,
      (bank.opening_balance_base+coalesce(sum(case when entry.id is not null then line.debit_base-line.credit_base else 0 end),0))::numeric(24,6) carrying_base,
      count(*) filter(where entry.id is not null and entry.transaction_currency<>bank.currency and entry.source_type not in('fx_revaluation','fx_revaluation_reversal'))::integer unsupported_count
    from public.business_bank_accounts bank
    left join public.business_journal_lines line on line.business_id=bank.business_id and line.account_id=bank.ledger_account_id
    left join public.business_journal_entries entry on entry.business_id=line.business_id and entry.id=line.journal_entry_id and entry.status='posted' and entry.entry_date<=run_record.closing_date
    where bank.business_id=p_business_id and bank.is_active and bank.currency<>v_base
    group by bank.id,bank.name,bank.ledger_account_id,bank.currency,bank.opening_balance_transaction,bank.opening_balance_base
  )
  insert into public.business_fx_revaluation_lines(business_id,revaluation_run_id,exposure_type,exposure_id,exposure_code,account_id,currency,transaction_balance,carrying_base,rate_id,closing_rate,revalued_base,adjustment_base)
  select p_business_id,p_run_id,'bank_balance',bank.id,bank.name,bank.ledger_account_id,bank.currency,bank.transaction_balance,bank.carrying_base,rate.rate_id,rate.rate_to_base,round(bank.transaction_balance*rate.rate_to_base,v_scale),round(bank.transaction_balance*rate.rate_to_base,v_scale)-bank.carrying_base
  from bank_exposure bank cross join lateral private.get_business_fx_rate_record(p_business_id,bank.currency,run_record.closing_date) rate
  where bank.unsupported_count=0 and bank.transaction_balance>0 and bank.carrying_base>=0 and round(bank.transaction_balance*rate.rate_to_base,v_scale)<>bank.carrying_base;

  select count(*) into v_skipped from (
    select bank.id from public.business_bank_accounts bank where bank.business_id=p_business_id and bank.is_active and bank.currency<>v_base and exists(
      select 1 from public.business_journal_lines line join public.business_journal_entries entry on entry.business_id=line.business_id and entry.id=line.journal_entry_id
      where line.business_id=p_business_id and line.account_id=bank.ledger_account_id and entry.status='posted' and entry.entry_date<=run_record.closing_date and entry.transaction_currency<>bank.currency and entry.source_type not in('fx_revaluation','fx_revaluation_reversal')
    )
  ) skipped;

  select count(*),coalesce(sum(case when exposure_type in('sales_receivable','bank_balance') and adjustment_base>0 then adjustment_base when exposure_type='supplier_payable' and adjustment_base<0 then -adjustment_base else 0 end),0),coalesce(sum(case when exposure_type in('sales_receivable','bank_balance') and adjustment_base<0 then -adjustment_base when exposure_type='supplier_payable' and adjustment_base>0 then adjustment_base else 0 end),0)
  into v_count,v_gain,v_loss from public.business_fx_revaluation_lines where business_id=p_business_id and revaluation_run_id=p_run_id;
  update public.business_fx_revaluation_runs set exposure_count=v_count,skipped_bank_count=v_skipped,total_gain_base=v_gain,total_loss_base=v_loss,updated_at=now() where business_id=p_business_id and id=p_run_id;
  perform private.write_business_fx_audit(p_business_id,null,p_run_id,'revaluation_recalculated',jsonb_build_object('exposure_count',v_count,'skipped_bank_count',v_skipped,'gain_base',v_gain,'loss_base',v_loss));
  return jsonb_build_object('id',p_run_id,'status','draft','exposure_count',v_count,'skipped_bank_count',v_skipped,'total_gain_base',v_gain,'total_loss_base',v_loss);
end;
$$;

create or replace function public.recalculate_business_fx_revaluation_run(p_business_id uuid,p_run_id uuid)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.recalculate_business_fx_revaluation_run_internal(p_business_id,p_run_id);$$;
