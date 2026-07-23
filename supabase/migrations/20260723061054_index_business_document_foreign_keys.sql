create index if not exists business_document_audit_folder_idx
  on public.business_document_audit_log(business_id, folder_id)
  where folder_id is not null;

create index if not exists business_document_audit_version_idx
  on public.business_document_audit_log(business_id, version_id)
  where version_id is not null;

create index if not exists business_documents_current_version_idx
  on public.business_documents(business_id, current_version_id)
  where current_version_id is not null;
