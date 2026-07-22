create or replace function private.get_business_simple_shop_party_balances_internal(p_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path='pg_catalog','public','private'
as $$
declare result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if not private.can_view_business_simple_shop(p_business_id) then raise exception 'Simple shop access required.' using errcode='42501'; end if;
  select jsonb_build_object(
    'customers',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',contact.id,'name',contact.display_name,'currency',contact.currency,
        'balance_base',coalesce(balance.balance_base,0),'invoice_count',coalesce(balance.invoice_count,0),
        'overdue_base',coalesce(balance.overdue_base,0)
      ) order by coalesce(balance.balance_base,0) desc,contact.display_name)
      from public.business_contacts contact
      left join lateral (
        select sum(invoice.total_base-invoice.paid_base-invoice.returned_base) balance_base,
               count(*) invoice_count,
               sum(case when invoice.due_date<current_date then invoice.total_base-invoice.paid_base-invoice.returned_base else 0 end) overdue_base
        from public.business_sales_invoices invoice
        where invoice.business_id=contact.business_id and invoice.customer_id=contact.id and invoice.status in('issued','partially_paid')
      ) balance on true
      where contact.business_id=p_business_id and contact.status='active' and contact.contact_type in('customer','both')
        and coalesce(balance.balance_base,0)>0
    ),'[]'::jsonb),
    'suppliers',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',contact.id,'name',contact.display_name,'currency',contact.currency,
        'balance_base',coalesce(balance.balance_base,0),'bill_count',coalesce(balance.bill_count,0),
        'overdue_base',coalesce(balance.overdue_base,0)
      ) order by coalesce(balance.balance_base,0) desc,contact.display_name)
      from public.business_contacts contact
      left join lateral (
        select sum(bill.total_base-bill.paid_base-bill.returned_base) balance_base,
               count(*) bill_count,
               sum(case when bill.due_date<current_date then bill.total_base-bill.paid_base-bill.returned_base else 0 end) overdue_base
        from public.business_supplier_bills bill
        where bill.business_id=contact.business_id and bill.supplier_id=contact.id and bill.status in('issued','partially_paid')
      ) balance on true
      where contact.business_id=p_business_id and contact.status='active' and contact.contact_type in('supplier','both')
        and coalesce(balance.balance_base,0)>0
    ),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.get_business_simple_shop_party_balances(p_business_id uuid)
returns jsonb language sql stable security invoker set search_path='pg_catalog','public','private'
as $$ select private.get_business_simple_shop_party_balances_internal(p_business_id); $$;

revoke all on function private.get_business_simple_shop_party_balances_internal(uuid) from public,anon;
grant execute on function private.get_business_simple_shop_party_balances_internal(uuid) to authenticated,service_role;
revoke all on function public.get_business_simple_shop_party_balances(uuid) from public,anon;
grant execute on function public.get_business_simple_shop_party_balances(uuid) to authenticated,service_role;
