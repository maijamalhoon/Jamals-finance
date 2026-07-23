create unique index if not exists business_fx_settlement_journal_source_idx
  on public.business_journal_entries(business_id,source_type,source_id)
  where source_type in ('fx_sales_payment','fx_supplier_payment');

create or replace function private.post_business_fx_controlled_journal(
  p_business_id uuid,p_entry_date date,p_source_type text,p_source_id uuid,p_reference text,
  p_description text,p_currency text,p_exchange_rate numeric,p_lines jsonb
) returns uuid language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare
  actor uuid:=auth.uid();v_base text;v_period uuid;v_journal uuid;item jsonb;v_line smallint:=0;
  v_account uuid;v_debit numeric(24,6);v_credit numeric(24,6);restore_ids uuid[]:='{}'::uuid[];
begin
  if actor is null then raise exception 'Authentication required.' using errcode='42501';end if;
  if p_source_type not in('fx_sales_payment','fx_supplier_payment','fx_revaluation','fx_revaluation_reversal') then raise exception 'Unsupported FX journal source.' using errcode='22023';end if;
  select base_currency into v_base from public.businesses where id=p_business_id and status='active';
  if v_base is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  if p_entry_date is null then raise exception 'FX journal date is required.' using errcode='22004';end if;
  if not public.is_supported_financial_currency(upper(btrim(p_currency))) or coalesce(p_exchange_rate,0)<=0 then raise exception 'FX journal currency and exchange rate are invalid.' using errcode='22023';end if;
  if upper(btrim(p_currency))=v_base and p_exchange_rate<>1 then raise exception 'Base-currency FX journals must use rate 1.' using errcode='22023';end if;
  if jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)<2 or jsonb_array_length(p_lines)>200 then raise exception 'FX journals require 2 to 200 lines.' using errcode='22023';end if;
  if exists(select 1 from public.business_journal_entries where business_id=p_business_id and source_type=p_source_type and source_id=p_source_id) then raise exception 'This FX source is already posted.' using errcode='23505';end if;
  select id into v_period from public.business_fiscal_periods where business_id=p_business_id and status='open' and p_entry_date between starts_on and ends_on order by starts_on desc limit 1 for update;
  if v_period is null then raise exception 'No open fiscal period contains the FX journal date.' using errcode='22008';end if;
  select coalesce(array_agg(account.id) filter(where not account.allow_manual_posting),'{}'::uuid[]) into restore_ids
  from public.business_chart_of_accounts account
  where account.business_id=p_business_id and account.is_active and account.id in(select (value->>'account_id')::uuid from jsonb_array_elements(p_lines));
  if (select count(distinct account.id) from public.business_chart_of_accounts account where account.business_id=p_business_id and account.is_active and account.id in(select (value->>'account_id')::uuid from jsonb_array_elements(p_lines))) <> (select count(distinct (value->>'account_id')::uuid) from jsonb_array_elements(p_lines)) then raise exception 'FX journal contains an inactive or invalid account.' using errcode='23514';end if;
  perform 1 from public.business_chart_of_accounts where business_id=p_business_id and id in(select (value->>'account_id')::uuid from jsonb_array_elements(p_lines)) for update;
  if cardinality(restore_ids)>0 then update public.business_chart_of_accounts set allow_manual_posting=true where business_id=p_business_id and id=any(restore_ids);end if;
  insert into public.business_journal_entries(business_id,entry_date,fiscal_period_id,source_type,source_id,reference,description,status,transaction_currency,exchange_rate,created_by)
  values(p_business_id,p_entry_date,v_period,'manual',p_source_id,nullif(btrim(coalesce(p_reference,'')),''),btrim(p_description),'draft',upper(btrim(p_currency)),p_exchange_rate,actor) returning id into v_journal;
  for item in select value from jsonb_array_elements(p_lines) loop
    v_line:=v_line+1;
    begin v_account:=(item->>'account_id')::uuid;v_debit:=coalesce(nullif(item->>'debit','')::numeric,0);v_credit:=coalesce(nullif(item->>'credit','')::numeric,0);
    exception when invalid_text_representation then raise exception 'FX journal lines contain invalid account or amount values.' using errcode='22023';end;
    insert into public.business_journal_lines(business_id,journal_entry_id,line_number,account_id,description,debit_transaction,credit_transaction)
    values(p_business_id,v_journal,v_line,v_account,nullif(btrim(coalesce(item->>'description','')),''),v_debit,v_credit);
  end loop;
  update public.business_journal_entries set source_type=p_source_type where business_id=p_business_id and id=v_journal and status='draft';
  if cardinality(restore_ids)>0 then update public.business_chart_of_accounts set allow_manual_posting=false where business_id=p_business_id and id=any(restore_ids);end if;
  update public.business_journal_entries set status='posted' where business_id=p_business_id and id=v_journal;
  return v_journal;
end;
$$;

create or replace function private.find_business_fx_transaction_split(
  p_payment_transaction numeric,p_settlement_rate numeric,p_carrying_base numeric,p_settlement_base numeric,p_rounding_scale integer
) returns table(carrying_transaction numeric,fx_transaction numeric)
language plpgsql immutable set search_path=pg_catalog
as $$
declare base_candidate numeric(24,6);candidate numeric(24,6);offset_value integer;difference_base numeric(24,6):=abs(p_settlement_base-p_carrying_base);difference_transaction numeric(24,6);
begin
  if p_payment_transaction<=0 or p_settlement_rate<=0 or p_carrying_base<=0 or p_settlement_base<=0 then raise exception 'FX split inputs must be positive.' using errcode='22023';end if;
  if difference_base=0 then return query select p_payment_transaction::numeric,0::numeric;return;end if;
  base_candidate:=round(p_carrying_base/p_settlement_rate,6);
  for offset_value in 0..5000 loop
    candidate:=base_candidate+(offset_value::numeric/1000000);
    if candidate>0 then difference_transaction:=abs(p_payment_transaction-candidate);if difference_transaction>0 and round(candidate*p_settlement_rate,p_rounding_scale)=p_carrying_base and round(difference_transaction*p_settlement_rate,p_rounding_scale)=difference_base then return query select candidate,difference_transaction;return;end if;end if;
    if offset_value>0 then candidate:=base_candidate-(offset_value::numeric/1000000);if candidate>0 then difference_transaction:=abs(p_payment_transaction-candidate);if difference_transaction>0 and round(candidate*p_settlement_rate,p_rounding_scale)=p_carrying_base and round(difference_transaction*p_settlement_rate,p_rounding_scale)=difference_base then return query select candidate,difference_transaction;return;end if;end if;end if;
  end loop;
  raise exception 'The FX settlement cannot be represented at journal precision. Adjust the rate or amount.' using errcode='22023';
end;
$$;

-- Sales and supplier settlement overrides continue in later versioned migrations.
