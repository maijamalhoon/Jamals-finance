-- Move the three remaining public SECURITY DEFINER business endpoints behind
-- stable public SECURITY INVOKER wrappers. The function objects are moved
-- rather than copied so the exact validated business logic remains unchanged.

alter function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) set schema private;

alter function private.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) rename to post_business_journal_entry_internal;

alter function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) set schema private;

alter function private.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) rename to create_business_sales_invoice_internal;

alter function public.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) set schema private;

alter function private.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) rename to upsert_business_contact_internal;

create or replace function public.post_business_journal_entry(
  p_business_id uuid,
  p_entry_date date,
  p_description text,
  p_reference text default null,
  p_source_type text default 'manual',
  p_source_id uuid default null,
  p_transaction_currency text default null,
  p_exchange_rate numeric default 1,
  p_lines jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $function$
begin
  return private.post_business_journal_entry_internal(
    p_business_id,
    p_entry_date,
    p_description,
    p_reference,
    p_source_type,
    p_source_id,
    p_transaction_currency,
    p_exchange_rate,
    p_lines
  );
end;
$function$;

create or replace function public.create_business_sales_invoice(
  p_business_id uuid,
  p_customer_id uuid,
  p_invoice_date date,
  p_due_date date,
  p_currency text default null,
  p_exchange_rate numeric default 1,
  p_notes text default null,
  p_lines jsonb default '[]'::jsonb,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $function$
begin
  return private.create_business_sales_invoice_internal(
    p_business_id,
    p_customer_id,
    p_invoice_date,
    p_due_date,
    p_currency,
    p_exchange_rate,
    p_notes,
    p_lines,
    p_idempotency_key
  );
end;
$function$;

create or replace function public.upsert_business_contact(
  p_business_id uuid,
  p_contact_type text,
  p_display_name text,
  p_legal_name text default null,
  p_email text default null,
  p_phone text default null,
  p_tax_id text default null,
  p_currency text default null,
  p_credit_limit numeric default 0,
  p_payment_terms_days integer default 0,
  p_billing_address jsonb default '{}'::jsonb,
  p_shipping_address jsonb default '{}'::jsonb,
  p_notes text default null,
  p_contact_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = pg_catalog, public, private
as $function$
begin
  return private.upsert_business_contact_internal(
    p_business_id,
    p_contact_type,
    p_display_name,
    p_legal_name,
    p_email,
    p_phone,
    p_tax_id,
    p_currency,
    p_credit_limit,
    p_payment_terms_days,
    p_billing_address,
    p_shipping_address,
    p_notes,
    p_contact_id
  );
end;
$function$;

revoke all on function private.post_business_journal_entry_internal(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) from public, anon;
revoke all on function private.create_business_sales_invoice_internal(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) from public, anon;
revoke all on function private.upsert_business_contact_internal(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) from public, anon;

grant execute on function private.post_business_journal_entry_internal(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) to authenticated, service_role;
grant execute on function private.create_business_sales_invoice_internal(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) to authenticated, service_role;
grant execute on function private.upsert_business_contact_internal(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) to authenticated, service_role;

revoke all on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) from public, anon;
revoke all on function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) from public, anon;
revoke all on function public.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) from public, anon;

grant execute on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) to authenticated, service_role;
grant execute on function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) to authenticated, service_role;
grant execute on function public.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) to authenticated, service_role;

comment on function public.post_business_journal_entry(
  uuid, date, text, text, text, uuid, text, numeric, jsonb
) is 'Stable tenant-authorized invoker gateway to private atomic journal posting.';
comment on function public.create_business_sales_invoice(
  uuid, uuid, date, date, text, numeric, text, jsonb, text
) is 'Stable tenant-authorized invoker gateway to private atomic invoice creation.';
comment on function public.upsert_business_contact(
  uuid, text, text, text, text, text, text, text, numeric, integer, jsonb, jsonb, text, uuid
) is 'Stable tenant-authorized invoker gateway to private atomic contact management.';
