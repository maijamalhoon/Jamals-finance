-- Public SECURITY INVOKER gateways require authenticated execution on their
-- private SECURITY DEFINER implementation functions. The private schema is not
-- exposed through the Data API and each implementation performs auth.uid(),
-- tenant-membership, role, status, and source-record validation internally.

revoke all on function private.create_business_warehouse_transfer_internal(
  uuid, date, uuid, uuid, jsonb, text, text
) from public, anon;
revoke all on function private.create_business_stock_adjustment_internal(
  uuid, date, uuid, text, jsonb, text, text
) from public, anon;
revoke all on function private.create_business_sales_return_internal(
  uuid, uuid, date, jsonb, text, text
) from public, anon;
revoke all on function private.create_business_purchase_return_internal(
  uuid, uuid, date, jsonb, text, text
) from public, anon;
revoke all on function private.record_business_sales_payment_internal(
  uuid, uuid, date, numeric, uuid, text, text
) from public, anon;
revoke all on function private.record_business_supplier_payment_internal(
  uuid, uuid, date, numeric, uuid, text, text
) from public, anon;

grant execute on function private.create_business_warehouse_transfer_internal(
  uuid, date, uuid, uuid, jsonb, text, text
) to authenticated, service_role;
grant execute on function private.create_business_stock_adjustment_internal(
  uuid, date, uuid, text, jsonb, text, text
) to authenticated, service_role;
grant execute on function private.create_business_sales_return_internal(
  uuid, uuid, date, jsonb, text, text
) to authenticated, service_role;
grant execute on function private.create_business_purchase_return_internal(
  uuid, uuid, date, jsonb, text, text
) to authenticated, service_role;
grant execute on function private.record_business_sales_payment_internal(
  uuid, uuid, date, numeric, uuid, text, text
) to authenticated, service_role;
grant execute on function private.record_business_supplier_payment_internal(
  uuid, uuid, date, numeric, uuid, text, text
) to authenticated, service_role;
