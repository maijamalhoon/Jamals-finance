-- Keep invoice and supplier-bill status aligned with payments plus posted returns.
create or replace function private.normalize_business_document_settlement_status()
returns trigger
language plpgsql
security definer
set search_path to pg_catalog,public
as $$
begin
  if new.status='draft' then
    return new;
  end if;

  if new.paid_transaction + new.returned_transaction >= new.total_transaction
     and new.paid_base + new.returned_base >= new.total_base then
    new.status:='paid';
  elsif new.paid_transaction + new.returned_transaction > 0
        or new.paid_base + new.returned_base > 0 then
    new.status:='partially_paid';
  else
    new.status:='issued';
  end if;
  return new;
end;
$$;

alter table public.business_sales_invoices
  drop constraint if exists business_sales_invoices_state_check;
alter table public.business_supplier_bills
  drop constraint if exists business_supplier_bills_state_check;

update public.business_sales_invoices invoice
set status=case
  when invoice.status='draft' then 'draft'
  when invoice.paid_transaction+invoice.returned_transaction>=invoice.total_transaction
    and invoice.paid_base+invoice.returned_base>=invoice.total_base then 'paid'
  when invoice.paid_transaction+invoice.returned_transaction>0
    or invoice.paid_base+invoice.returned_base>0 then 'partially_paid'
  else 'issued'
end;

update public.business_supplier_bills bill
set status=case
  when bill.status='draft' then 'draft'
  when bill.paid_transaction+bill.returned_transaction>=bill.total_transaction
    and bill.paid_base+bill.returned_base>=bill.total_base then 'paid'
  when bill.paid_transaction+bill.returned_transaction>0
    or bill.paid_base+bill.returned_base>0 then 'partially_paid'
  else 'issued'
end;

alter table public.business_sales_invoices
  add constraint business_sales_invoices_state_check
  check (
    (status='draft' and issued_at is null and journal_entry_id is null
      and paid_transaction=0 and paid_base=0 and returned_transaction=0 and returned_base=0)
    or
    (status='issued' and issued_at is not null and journal_entry_id is not null
      and paid_transaction=0 and paid_base=0 and returned_transaction=0 and returned_base=0)
    or
    (status='partially_paid' and issued_at is not null and journal_entry_id is not null
      and (paid_transaction+returned_transaction>0 or paid_base+returned_base>0)
      and paid_transaction+returned_transaction<total_transaction
      and paid_base+returned_base<total_base)
    or
    (status='paid' and issued_at is not null and journal_entry_id is not null
      and paid_transaction+returned_transaction>=total_transaction
      and paid_base+returned_base>=total_base)
  );

alter table public.business_supplier_bills
  add constraint business_supplier_bills_state_check
  check (
    (status='draft' and bill_number is null and bill_code is null
      and journal_entry_id is null and issued_at is null
      and paid_transaction=0 and paid_base=0 and returned_transaction=0 and returned_base=0)
    or
    (status='issued' and bill_number is not null and bill_code is not null
      and journal_entry_id is not null and issued_at is not null
      and total_transaction>0 and total_base>0
      and paid_transaction=0 and paid_base=0 and returned_transaction=0 and returned_base=0)
    or
    (status='partially_paid' and bill_number is not null and bill_code is not null
      and journal_entry_id is not null and issued_at is not null
      and (paid_transaction+returned_transaction>0 or paid_base+returned_base>0)
      and paid_transaction+returned_transaction<total_transaction
      and paid_base+returned_base<total_base)
    or
    (status='paid' and bill_number is not null and bill_code is not null
      and journal_entry_id is not null and issued_at is not null
      and total_transaction>0 and total_base>0
      and paid_transaction+returned_transaction>=total_transaction
      and paid_base+returned_base>=total_base)
  );

drop trigger if exists business_sales_invoices_normalize_settlement_status
  on public.business_sales_invoices;
create trigger business_sales_invoices_normalize_settlement_status
before update of paid_transaction,paid_base,returned_transaction,returned_base,total_transaction,total_base,status
on public.business_sales_invoices
for each row execute function private.normalize_business_document_settlement_status();

drop trigger if exists business_supplier_bills_normalize_settlement_status
  on public.business_supplier_bills;
create trigger business_supplier_bills_normalize_settlement_status
before update of paid_transaction,paid_base,returned_transaction,returned_base,total_transaction,total_base,status
on public.business_supplier_bills
for each row execute function private.normalize_business_document_settlement_status();

revoke execute on function private.normalize_business_document_settlement_status()
  from public,anon,authenticated;
