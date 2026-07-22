create index business_period_close_runs_journal_idx
  on public.business_period_close_runs(business_id,journal_entry_id)
  where journal_entry_id is not null;
create index business_period_close_runs_related_journal_idx
  on public.business_period_close_runs(business_id,related_journal_entry_id)
  where related_journal_entry_id is not null;
create index business_tax_codes_output_account_idx
  on public.business_tax_codes(business_id,output_account_id)
  where output_account_id is not null;
create index business_tax_codes_input_account_idx
  on public.business_tax_codes(business_id,input_account_id)
  where input_account_id is not null;
create index business_tax_settings_default_sales_code_idx
  on public.business_tax_settings(business_id,default_sales_tax_code_id)
  where default_sales_tax_code_id is not null;
create index business_tax_settings_default_purchase_code_idx
  on public.business_tax_settings(business_id,default_purchase_tax_code_id)
  where default_purchase_tax_code_id is not null;
create index business_tax_settings_created_by_idx
  on public.business_tax_settings(created_by)
  where created_by is not null;
create index business_tax_settings_updated_by_idx
  on public.business_tax_settings(updated_by)
  where updated_by is not null;

alter policy business_tax_codes_insert on public.business_tax_codes
with check((select private.can_manage_business_tax(business_id)) and created_by=(select auth.uid()));
alter policy business_tax_codes_update on public.business_tax_codes
using((select private.can_manage_business_tax(business_id)))
with check((select private.can_manage_business_tax(business_id)) and updated_by=(select auth.uid()));
alter policy business_tax_settings_insert on public.business_tax_settings
with check((select private.can_manage_business_tax(business_id)) and created_by=(select auth.uid()));
alter policy business_tax_settings_update on public.business_tax_settings
using((select private.can_manage_business_tax(business_id)))
with check((select private.can_manage_business_tax(business_id)) and updated_by=(select auth.uid()));
alter policy business_tax_filings_insert on public.business_tax_filings
with check((select private.can_manage_business_tax(business_id)) and prepared_by=(select auth.uid()));
