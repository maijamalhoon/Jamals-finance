create or replace function private.record_business_supplier_payment_internal(
  p_business_id uuid,p_bill_id uuid,p_payment_date date,p_amount numeric,p_payment_account_id uuid,p_reference text,p_idempotency_key text
) returns uuid language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();bill_record record;rounding_scale smallint;accounting_basis text;
  payment_amount numeric(24,6);settlement_base numeric(24,6);carrying_base numeric(24,6);outstanding_transaction numeric(24,6);outstanding_base numeric(24,6);
  new_paid_transaction numeric(24,6);new_paid_base numeric(24,6);created_payment_id uuid;created_journal_id uuid;existing_payment_id uuid;is_final_payment boolean;
  rate_record record;v_base text;gain_account uuid;loss_account uuid;ap_account uuid;carrying_tx numeric(24,6);fx_tx numeric(24,6);difference_base numeric(24,6);lines jsonb;bank_currency text;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501';end if;
  if not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=current_user_id and membership.status='active' and ((membership.role in('owner','admin','accountant','manager') or (membership.role='inventory' and exists(select 1 from public.businesses shop_business where shop_business.id=p_business_id and shop_business.workspace_mode='simple_shop')) or 'shop.purchase'=any(membership.permissions)) or '*'=any(membership.permissions) or 'purchases.manage'=any(membership.permissions) or 'purchases.pay'=any(membership.permissions))) then raise exception 'Supplier payment permission required.' using errcode='42501';end if;
  if p_idempotency_key is not null then select payment.id into existing_payment_id from public.business_supplier_payments payment where payment.business_id=p_business_id and payment.idempotency_key=nullif(btrim(p_idempotency_key),'');if existing_payment_id is not null then return existing_payment_id;end if;end if;
  select bill.* into bill_record from public.business_supplier_bills bill where bill.id=p_bill_id and bill.business_id=p_business_id and bill.status in('issued','partially_paid') for update;
  if not found then raise exception 'Open supplier bill not found.' using errcode='P0002';end if;
  if exists(select 1 from public.business_fx_revaluation_lines line join public.business_fx_revaluation_runs run on run.business_id=line.business_id and run.id=line.revaluation_run_id where line.business_id=p_business_id and line.exposure_type='supplier_payable' and line.exposure_id=p_bill_id and run.status='posted') then raise exception 'Reverse the active FX revaluation before paying this supplier bill.' using errcode='55000';end if;
  select settings.rounding_scale,settings.accounting_basis,business.base_currency into rounding_scale,accounting_basis,v_base from public.business_accounting_settings settings join public.businesses business on business.id=settings.business_id where settings.business_id=p_business_id;
  if rounding_scale is null then raise exception 'Accounting settings are missing.' using errcode='23503';end if;
  if accounting_basis<>'accrual' then raise exception 'Supplier payments currently require accrual accounting.' using errcode='0A000';end if;
  if p_payment_date is null or p_payment_date<bill_record.bill_date then raise exception 'Supplier payment date is invalid.' using errcode='22008';end if;
  outstanding_transaction:=bill_record.total_transaction-bill_record.paid_transaction-bill_record.returned_transaction;
  outstanding_base:=bill_record.total_base-bill_record.paid_base-bill_record.returned_base;
  payment_amount:=round(coalesce(p_amount,0),rounding_scale);
  if outstanding_transaction<=0 then raise exception 'This supplier bill has no payable balance after returns.' using errcode='22023';end if;
  if payment_amount<=0 or payment_amount>outstanding_transaction then raise exception 'Payment must be positive and cannot exceed the return-adjusted outstanding payable.' using errcode='22023';end if;
  if not exists(select 1 from public.business_chart_of_accounts account where account.id=p_payment_account_id and account.business_id=p_business_id and account.is_active and account.system_key in('cash','bank')) then raise exception 'Payment account must be an active cash or bank account.' using errcode='23514';end if;
  select bank.currency into bank_currency from public.business_bank_accounts bank where bank.business_id=p_business_id and bank.ledger_account_id=p_payment_account_id and bank.is_active limit 1;
  if bank_currency is not null and bank_currency not in(bill_record.currency,v_base) then raise exception 'The selected bank account currency does not match the bill or base currency.' using errcode='23514';end if;
  select * into rate_record from private.get_business_fx_rate_record(p_business_id,bill_record.currency,p_payment_date);
  is_final_payment:=payment_amount=outstanding_transaction;
  carrying_base:=case when is_final_payment then outstanding_base else round(payment_amount*bill_record.exchange_rate,rounding_scale) end;
  settlement_base:=round(payment_amount*rate_record.rate_to_base,rounding_scale);
  if carrying_base<=0 or settlement_base<=0 then raise exception 'Calculated FX supplier settlement is invalid.' using errcode='22023';end if;
  difference_base:=settlement_base-carrying_base;
  select settings.realized_gain_account_id,settings.realized_loss_account_id into gain_account,loss_account from public.business_fx_settings settings where settings.business_id=p_business_id;
  select id into ap_account from public.business_chart_of_accounts where business_id=p_business_id and system_key='accounts_payable' and is_active;
  if gain_account is null or loss_account is null or ap_account is null then raise exception 'FX supplier settlement accounts are missing.' using errcode='23503';end if;
  select split.carrying_transaction,split.fx_transaction into carrying_tx,fx_tx from private.find_business_fx_transaction_split(payment_amount,rate_record.rate_to_base,carrying_base,settlement_base,rounding_scale) split;
  if difference_base>0 then
    lines:=jsonb_build_array(jsonb_build_object('account_id',ap_account,'debit',carrying_tx,'credit',0,'description','Accounts payable settlement'),jsonb_build_object('account_id',loss_account,'debit',fx_tx,'credit',0,'description','Realized foreign exchange loss'),jsonb_build_object('account_id',p_payment_account_id,'debit',0,'credit',payment_amount,'description','Foreign-currency payment'));
  elsif difference_base<0 then
    lines:=jsonb_build_array(jsonb_build_object('account_id',ap_account,'debit',carrying_tx,'credit',0,'description','Accounts payable settlement'),jsonb_build_object('account_id',p_payment_account_id,'debit',0,'credit',payment_amount,'description','Foreign-currency payment'),jsonb_build_object('account_id',gain_account,'debit',0,'credit',fx_tx,'description','Realized foreign exchange gain'));
  else
    lines:=jsonb_build_array(jsonb_build_object('account_id',ap_account,'debit',payment_amount,'credit',0,'description','Accounts payable settlement'),jsonb_build_object('account_id',p_payment_account_id,'debit',0,'credit',payment_amount,'description','Payment'));
  end if;
  insert into public.business_supplier_payments(business_id,bill_id,payment_date,amount_transaction,amount_base,carrying_amount_base,settlement_rate_id,settlement_exchange_rate,realized_fx_gain_base,realized_fx_loss_base,payment_account_id,reference,idempotency_key,status,created_by)
  values(p_business_id,p_bill_id,p_payment_date,payment_amount,settlement_base,carrying_base,rate_record.rate_id,rate_record.rate_to_base,greatest(-difference_base,0),greatest(difference_base,0),p_payment_account_id,nullif(btrim(coalesce(p_reference,'')),''),nullif(btrim(coalesce(p_idempotency_key,'')),''),'draft',current_user_id) returning id into created_payment_id;
  created_journal_id:=private.post_business_fx_controlled_journal(p_business_id,p_payment_date,'fx_supplier_payment',created_payment_id,nullif(btrim(coalesce(p_reference,bill_record.bill_code)),''),'Payment made for '||bill_record.bill_code,bill_record.currency,rate_record.rate_to_base,lines);
  update public.business_supplier_payments set status='posted',journal_entry_id=created_journal_id,posted_at=now() where business_id=p_business_id and id=created_payment_id;
  new_paid_transaction:=bill_record.paid_transaction+payment_amount;new_paid_base:=bill_record.paid_base+carrying_base;
  update public.business_supplier_bills set paid_transaction=new_paid_transaction,paid_base=new_paid_base,status=case when new_paid_transaction=total_transaction then 'paid' else 'partially_paid' end,updated_at=now() where business_id=p_business_id and id=p_bill_id;
  perform private.write_business_fx_audit(p_business_id,rate_record.rate_id,null,'supplier_settlement_posted',jsonb_build_object('payment_id',created_payment_id,'currency',bill_record.currency,'transaction_amount',payment_amount,'carrying_base',carrying_base,'settlement_base',settlement_base,'realized_gain_base',greatest(-difference_base,0),'realized_loss_base',greatest(difference_base,0)));
  return created_payment_id;
end;
$$;

revoke execute on function private.post_business_fx_controlled_journal(uuid,date,text,uuid,text,text,text,numeric,jsonb),private.find_business_fx_transaction_split(numeric,numeric,numeric,numeric,integer) from public,anon,authenticated;
revoke execute on function private.record_business_sales_payment_internal(uuid,uuid,date,numeric,uuid,text,text),private.record_business_supplier_payment_internal(uuid,uuid,date,numeric,uuid,text,text) from public,anon;
grant execute on function private.record_business_sales_payment_internal(uuid,uuid,date,numeric,uuid,text,text),private.record_business_supplier_payment_internal(uuid,uuid,date,numeric,uuid,text,text) to authenticated;
