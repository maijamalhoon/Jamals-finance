-- Payments settle only the effective balance after posted returns.
create or replace function private.record_business_sales_payment_internal(
  p_business_id uuid,p_invoice_id uuid,p_payment_date date,p_amount numeric,
  p_payment_account_id uuid,p_reference text,p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path to pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();invoice_record record;rounding_scale smallint;accounting_basis text;
  payment_amount numeric(24,6);payment_amount_base numeric(24,6);outstanding_transaction numeric(24,6);outstanding_base numeric(24,6);
  new_paid_transaction numeric(24,6);new_paid_base numeric(24,6);created_payment_id uuid;created_journal_id uuid;existing_payment_id uuid;is_final_payment boolean;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501';end if;
  if not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=current_user_id and membership.status='active' and (membership.role in('owner','admin','accountant','manager','sales','cashier') or '*'=any(membership.permissions) or 'sales.manage'=any(membership.permissions) or 'sales.collect'=any(membership.permissions))) then raise exception 'Payment collection permission required.' using errcode='42501';end if;
  if p_idempotency_key is not null then select payment.id into existing_payment_id from public.business_sales_payments payment where payment.business_id=p_business_id and payment.idempotency_key=nullif(btrim(p_idempotency_key),'');if existing_payment_id is not null then return existing_payment_id;end if;end if;
  select invoice.* into invoice_record from public.business_sales_invoices invoice where invoice.id=p_invoice_id and invoice.business_id=p_business_id and invoice.status in('issued','partially_paid') for update;if not found then raise exception 'Open sales invoice not found.' using errcode='P0002';end if;
  select settings.rounding_scale,settings.accounting_basis into rounding_scale,accounting_basis from public.business_accounting_settings settings where settings.business_id=p_business_id;if rounding_scale is null then raise exception 'Accounting settings are missing.' using errcode='23503';end if;if accounting_basis<>'accrual' then raise exception 'Sales payments currently require accrual accounting.' using errcode='0A000';end if;
  if p_payment_date is null or p_payment_date<invoice_record.invoice_date then raise exception 'Payment date is invalid.' using errcode='22008';end if;
  outstanding_transaction:=invoice_record.total_transaction-invoice_record.paid_transaction-invoice_record.returned_transaction;
  outstanding_base:=invoice_record.total_base-invoice_record.paid_base-invoice_record.returned_base;
  payment_amount:=round(coalesce(p_amount,0),rounding_scale);
  if outstanding_transaction<=0 then raise exception 'This invoice has no collectible balance after returns.' using errcode='22023';end if;
  if payment_amount<=0 or payment_amount>outstanding_transaction then raise exception 'Payment must be positive and cannot exceed the return-adjusted outstanding balance.' using errcode='22023';end if;
  if not exists(select 1 from public.business_chart_of_accounts account where account.id=p_payment_account_id and account.business_id=p_business_id and account.is_active and account.system_key in('cash','bank')) then raise exception 'Payment account must be an active cash or bank account.' using errcode='23514';end if;
  is_final_payment:=payment_amount=outstanding_transaction;
  payment_amount_base:=case when is_final_payment then outstanding_base else round(payment_amount*invoice_record.exchange_rate,rounding_scale) end;
  if payment_amount_base<=0 then raise exception 'Calculated base-currency payment is invalid.' using errcode='22023';end if;
  insert into public.business_sales_payments(business_id,invoice_id,payment_date,amount_transaction,amount_base,payment_account_id,reference,idempotency_key,status,created_by) values(p_business_id,p_invoice_id,p_payment_date,payment_amount,payment_amount_base,p_payment_account_id,nullif(btrim(coalesce(p_reference,'')),''),nullif(btrim(coalesce(p_idempotency_key,'')),''),'draft',current_user_id) returning id into created_payment_id;
  created_journal_id:=public.post_business_journal_entry(p_business_id,p_payment_date,'Payment received for '||invoice_record.invoice_code,nullif(btrim(coalesce(p_reference,invoice_record.invoice_code)),''),'sales_payment',created_payment_id,invoice_record.currency,invoice_record.exchange_rate,'[]'::jsonb);
  update public.business_sales_payments payment set status='posted',journal_entry_id=created_journal_id,posted_at=now() where payment.id=created_payment_id and payment.business_id=p_business_id;
  new_paid_transaction:=invoice_record.paid_transaction+payment_amount;new_paid_base:=invoice_record.paid_base+payment_amount_base;
  update public.business_sales_invoices invoice set paid_transaction=new_paid_transaction,paid_base=new_paid_base,status=case when new_paid_transaction=invoice.total_transaction then 'paid' else 'partially_paid' end,updated_at=now() where invoice.id=p_invoice_id and invoice.business_id=p_business_id;
  return created_payment_id;
end;$$;

create or replace function public.record_business_sales_payment(
  p_business_id uuid,p_invoice_id uuid,p_payment_date date,p_amount numeric,
  p_payment_account_id uuid,p_reference text default null,p_idempotency_key text default null
)
returns uuid language plpgsql set search_path to pg_catalog,public,private as $$
begin return private.record_business_sales_payment_internal(p_business_id,p_invoice_id,p_payment_date,p_amount,p_payment_account_id,p_reference,p_idempotency_key);end;$$;

create or replace function private.record_business_supplier_payment_internal(
  p_business_id uuid,p_bill_id uuid,p_payment_date date,p_amount numeric,
  p_payment_account_id uuid,p_reference text,p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path to pg_catalog,public,private
as $$
declare
  current_user_id uuid:=auth.uid();bill_record record;rounding_scale smallint;accounting_basis text;
  payment_amount numeric(24,6);payment_amount_base numeric(24,6);outstanding_transaction numeric(24,6);outstanding_base numeric(24,6);
  new_paid_transaction numeric(24,6);new_paid_base numeric(24,6);created_payment_id uuid;created_journal_id uuid;existing_payment_id uuid;is_final_payment boolean;
begin
  if current_user_id is null then raise exception 'Authentication required.' using errcode='42501';end if;
  if not exists(select 1 from public.business_members membership where membership.business_id=p_business_id and membership.user_id=current_user_id and membership.status='active' and (membership.role in('owner','admin','accountant','manager') or '*'=any(membership.permissions) or 'purchases.manage'=any(membership.permissions) or 'purchases.pay'=any(membership.permissions))) then raise exception 'Supplier payment permission required.' using errcode='42501';end if;
  if p_idempotency_key is not null then select payment.id into existing_payment_id from public.business_supplier_payments payment where payment.business_id=p_business_id and payment.idempotency_key=nullif(btrim(p_idempotency_key),'');if existing_payment_id is not null then return existing_payment_id;end if;end if;
  select bill.* into bill_record from public.business_supplier_bills bill where bill.id=p_bill_id and bill.business_id=p_business_id and bill.status in('issued','partially_paid') for update;if not found then raise exception 'Open supplier bill not found.' using errcode='P0002';end if;
  select settings.rounding_scale,settings.accounting_basis into rounding_scale,accounting_basis from public.business_accounting_settings settings where settings.business_id=p_business_id;if rounding_scale is null then raise exception 'Accounting settings are missing.' using errcode='23503';end if;if accounting_basis<>'accrual' then raise exception 'Supplier payments currently require accrual accounting.' using errcode='0A000';end if;
  if p_payment_date is null or p_payment_date<bill_record.bill_date then raise exception 'Supplier payment date is invalid.' using errcode='22008';end if;
  outstanding_transaction:=bill_record.total_transaction-bill_record.paid_transaction-bill_record.returned_transaction;
  outstanding_base:=bill_record.total_base-bill_record.paid_base-bill_record.returned_base;
  payment_amount:=round(coalesce(p_amount,0),rounding_scale);
  if outstanding_transaction<=0 then raise exception 'This supplier bill has no payable balance after returns.' using errcode='22023';end if;
  if payment_amount<=0 or payment_amount>outstanding_transaction then raise exception 'Payment must be positive and cannot exceed the return-adjusted outstanding payable.' using errcode='22023';end if;
  if not exists(select 1 from public.business_chart_of_accounts account where account.id=p_payment_account_id and account.business_id=p_business_id and account.is_active and account.system_key in('cash','bank')) then raise exception 'Payment account must be an active cash or bank account.' using errcode='23514';end if;
  is_final_payment:=payment_amount=outstanding_transaction;
  payment_amount_base:=case when is_final_payment then outstanding_base else round(payment_amount*bill_record.exchange_rate,rounding_scale) end;
  if payment_amount_base<=0 then raise exception 'Calculated base-currency supplier payment is invalid.' using errcode='22023';end if;
  insert into public.business_supplier_payments(business_id,bill_id,payment_date,amount_transaction,amount_base,payment_account_id,reference,idempotency_key,status,created_by) values(p_business_id,p_bill_id,p_payment_date,payment_amount,payment_amount_base,p_payment_account_id,nullif(btrim(coalesce(p_reference,'')),''),nullif(btrim(coalesce(p_idempotency_key,'')),''),'draft',current_user_id) returning id into created_payment_id;
  created_journal_id:=public.post_business_journal_entry(p_business_id,p_payment_date,'Payment made for '||bill_record.bill_code,nullif(btrim(coalesce(p_reference,bill_record.bill_code)),''),'supplier_payment',created_payment_id,bill_record.currency,bill_record.exchange_rate,'[]'::jsonb);
  update public.business_supplier_payments payment set status='posted',journal_entry_id=created_journal_id,posted_at=now() where payment.id=created_payment_id and payment.business_id=p_business_id;
  new_paid_transaction:=bill_record.paid_transaction+payment_amount;new_paid_base:=bill_record.paid_base+payment_amount_base;
  update public.business_supplier_bills bill set paid_transaction=new_paid_transaction,paid_base=new_paid_base,status=case when new_paid_transaction=bill.total_transaction then 'paid' else 'partially_paid' end,updated_at=now() where bill.id=p_bill_id and bill.business_id=p_business_id;
  return created_payment_id;
end;$$;

revoke all on function public.record_business_sales_payment(uuid,uuid,date,numeric,uuid,text,text) from public,anon;
grant execute on function public.record_business_sales_payment(uuid,uuid,date,numeric,uuid,text,text) to authenticated,service_role;
revoke execute on function private.record_business_sales_payment_internal(uuid,uuid,date,numeric,uuid,text,text) from public,anon,authenticated;
revoke execute on function private.record_business_supplier_payment_internal(uuid,uuid,date,numeric,uuid,text,text) from public,anon,authenticated;
