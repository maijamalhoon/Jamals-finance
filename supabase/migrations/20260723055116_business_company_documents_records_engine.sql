create or replace function private.business_team_permission_catalog()
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
select array[
  'team.view','team.manage','notifications.view','notifications.manage',
  'accounting.view','accounting.manage','banking.view','banking.manage','tax.view','tax.manage',
  'budget.view','budget.manage','budget.approve','documents.view','documents.manage',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.safe_uuid(p_value text)
returns uuid
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
begin
  return p_value::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

create or replace function private.can_view_business_documents(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1
  from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager','sales','inventory','viewer')
      or '*' = any(membership.permissions)
      or 'documents.view' = any(membership.permissions)
      or 'documents.manage' = any(membership.permissions)
    )
);
$$;

create or replace function private.can_manage_business_documents(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
select auth.uid() is not null and exists(
  select 1
  from public.business_members membership
  where membership.business_id = p_business_id
    and membership.user_id = auth.uid()
    and membership.status = 'active'
    and (
      membership.role in ('owner','admin','accountant','manager')
      or '*' = any(membership.permissions)
      or 'documents.manage' = any(membership.permissions)
    )
);
$$;

revoke all on function private.safe_uuid(text) from public, anon, authenticated;
revoke all on function private.can_view_business_documents(uuid) from public, anon;
revoke all on function private.can_manage_business_documents(uuid) from public, anon;
grant execute on function private.can_view_business_documents(uuid) to authenticated;
grant execute on function private.can_manage_business_documents(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'business-documents','business-documents',false,26214400,
  array[
    'application/pdf','image/jpeg','image/png','image/webp','text/plain','text/csv','application/csv',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]::text[]
)
on conflict(id) do update
set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table public.business_document_folders(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  parent_folder_id uuid,
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_document_folders_business_id_id_key unique(business_id,id),
  constraint business_document_folders_parent_fkey foreign key(business_id,parent_folder_id)
    references public.business_document_folders(business_id,id) on delete restrict,
  constraint business_document_folders_name_check check(char_length(btrim(name)) between 1 and 100),
  constraint business_document_folders_parent_check check(parent_folder_id is null or parent_folder_id<>id)
);
create unique index business_document_folders_name_uidx
  on public.business_document_folders(business_id,coalesce(parent_folder_id,'00000000-0000-0000-0000-000000000000'::uuid),lower(btrim(name)));
create index business_document_folders_parent_idx on public.business_document_folders(business_id,parent_folder_id,name);
create index business_document_folders_created_by_idx on public.business_document_folders(created_by);

create table public.business_documents(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  folder_id uuid,
  title text not null,
  document_type text not null default 'general',
  description text,
  tags text[] not null default '{}'::text[],
  related_type text,
  related_id uuid,
  status text not null default 'active',
  current_version_id uuid,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  archived_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_documents_business_id_id_key unique(business_id,id),
  constraint business_documents_folder_fkey foreign key(business_id,folder_id)
    references public.business_document_folders(business_id,id) on delete restrict,
  constraint business_documents_title_check check(char_length(btrim(title)) between 2 and 160),
  constraint business_documents_type_check check(document_type in('general','contract','invoice','receipt','statement','tax','legal','identity','license','certificate','policy','report','other')),
  constraint business_documents_description_check check(description is null or char_length(btrim(description))<=2000),
  constraint business_documents_tags_check check(cardinality(tags)<=20),
  constraint business_documents_related_type_check check(related_type is null or related_type in('contact','sales_invoice','supplier_bill','product','journal_entry','crm_lead','crm_opportunity','tax_filing','bank_reconciliation','budget_scenario')),
  constraint business_documents_related_pair_check check((related_type is null)=(related_id is null)),
  constraint business_documents_status_check check(status in('active','archived')),
  constraint business_documents_archive_state_check check((status='active' and archived_at is null and archived_by is null) or (status='archived' and archived_at is not null))
);
create index business_documents_business_status_idx on public.business_documents(business_id,status,updated_at desc);
create index business_documents_folder_idx on public.business_documents(business_id,folder_id,updated_at desc);
create index business_documents_related_idx on public.business_documents(business_id,related_type,related_id);
create index business_documents_created_by_idx on public.business_documents(created_by);
create index business_documents_updated_by_idx on public.business_documents(updated_by);
create index business_documents_archived_by_idx on public.business_documents(archived_by);
create index business_documents_tags_gin_idx on public.business_documents using gin(tags);

create table public.business_document_versions(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_id uuid not null,
  version_number integer not null,
  object_path text not null,
  original_file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text,
  version_notes text,
  status text not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  uploaded_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  constraint business_document_versions_document_fkey foreign key(business_id,document_id)
    references public.business_documents(business_id,id) on delete cascade,
  constraint business_document_versions_business_id_id_key unique(business_id,id),
  constraint business_document_versions_number_key unique(document_id,version_number),
  constraint business_document_versions_object_key unique(object_path),
  constraint business_document_versions_number_check check(version_number between 1 and 10000),
  constraint business_document_versions_path_check check(char_length(object_path) between 20 and 600),
  constraint business_document_versions_file_check check(char_length(btrim(original_file_name)) between 1 and 255),
  constraint business_document_versions_mime_check check(char_length(btrim(mime_type)) between 3 and 150),
  constraint business_document_versions_size_check check(size_bytes between 1 and 26214400),
  constraint business_document_versions_checksum_check check(checksum_sha256 is null or checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint business_document_versions_notes_check check(version_notes is null or char_length(btrim(version_notes))<=1000),
  constraint business_document_versions_status_check check(status in('pending','ready','failed')),
  constraint business_document_versions_state_check check((status='pending' and uploaded_at is null and failed_at is null) or (status='ready' and uploaded_at is not null and failed_at is null) or (status='failed' and uploaded_at is null and failed_at is not null and failure_reason is not null)),
  constraint business_document_versions_failure_check check(failure_reason is null or char_length(btrim(failure_reason))<=500)
);
alter table public.business_documents add constraint business_documents_current_version_fkey
  foreign key(business_id,current_version_id) references public.business_document_versions(business_id,id) on delete restrict;
create index business_document_versions_document_idx on public.business_document_versions(business_id,document_id,version_number desc);
create index business_document_versions_status_idx on public.business_document_versions(business_id,status,created_at desc);
create index business_document_versions_created_by_idx on public.business_document_versions(created_by);

create table public.business_document_audit_log(
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  document_id uuid,
  version_id uuid,
  folder_id uuid,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint business_document_audit_document_fkey foreign key(business_id,document_id) references public.business_documents(business_id,id) on delete cascade,
  constraint business_document_audit_version_fkey foreign key(business_id,version_id) references public.business_document_versions(business_id,id) on delete cascade,
  constraint business_document_audit_folder_fkey foreign key(business_id,folder_id) references public.business_document_folders(business_id,id) on delete cascade,
  constraint business_document_audit_action_check check(action in('folder_created','upload_prepared','upload_completed','upload_failed','metadata_updated','archived','restored','version_prepared','version_completed')),
  constraint business_document_audit_metadata_check check(jsonb_typeof(metadata)='object')
);
create index business_document_audit_business_idx on public.business_document_audit_log(business_id,created_at desc,id desc);
create index business_document_audit_document_idx on public.business_document_audit_log(business_id,document_id,created_at desc);
create index business_document_audit_actor_idx on public.business_document_audit_log(actor_user_id);

create or replace function private.enforce_business_document_engine_write()
returns trigger language plpgsql set search_path=pg_catalog as $$
declare action_name text:=coalesce(current_setting('app.business_document_action',true),'');
begin
  if current_user<>'postgres' then raise exception 'Business document records are managed by the documents engine.' using errcode='55000'; end if;
  if tg_table_name='business_document_folders' and action_name not in('folder_create') then raise exception 'Unsupported document folder write.' using errcode='55000';
  elsif tg_table_name='business_documents' and action_name not in('upload_prepare','version_prepare','finalize','metadata','archive','restore','fail') then raise exception 'Unsupported business document write.' using errcode='55000';
  elsif tg_table_name='business_document_versions' and action_name not in('upload_prepare','version_prepare','finalize','fail') then raise exception 'Unsupported business document version write.' using errcode='55000';
  elsif tg_table_name='business_document_audit_log' and action_name not in('audit') then raise exception 'Unsupported business document audit write.' using errcode='55000'; end if;
  if tg_op='DELETE' then return old; end if; return new;
end;$$;
create trigger business_document_folders_engine_guard before insert or update or delete on public.business_document_folders for each row execute function private.enforce_business_document_engine_write();
create trigger business_documents_engine_guard before insert or update or delete on public.business_documents for each row execute function private.enforce_business_document_engine_write();
create trigger business_document_versions_engine_guard before insert or update or delete on public.business_document_versions for each row execute function private.enforce_business_document_engine_write();
create trigger business_document_audit_engine_guard before insert or update or delete on public.business_document_audit_log for each row execute function private.enforce_business_document_engine_write();
create trigger business_document_folders_touch_updated_at before update on public.business_document_folders for each row execute function private.set_business_workspace_updated_at();
create trigger business_documents_touch_updated_at before update on public.business_documents for each row execute function private.set_business_workspace_updated_at();

alter table public.business_document_folders enable row level security;
alter table public.business_documents enable row level security;
alter table public.business_document_versions enable row level security;
alter table public.business_document_audit_log enable row level security;
create policy business_document_folders_select on public.business_document_folders for select to authenticated using(private.can_view_business_documents(business_id));
create policy business_documents_select on public.business_documents for select to authenticated using(private.can_view_business_documents(business_id));
create policy business_document_versions_select on public.business_document_versions for select to authenticated using(private.can_view_business_documents(business_id));
create policy business_document_audit_select on public.business_document_audit_log for select to authenticated using(private.can_view_business_documents(business_id));
revoke all on public.business_document_folders from public,anon,authenticated;
revoke all on public.business_documents from public,anon,authenticated;
revoke all on public.business_document_versions from public,anon,authenticated;
revoke all on public.business_document_audit_log from public,anon,authenticated;
grant select on public.business_document_folders,public.business_documents,public.business_document_versions,public.business_document_audit_log to authenticated;

drop policy if exists business_documents_storage_select on storage.objects;
drop policy if exists business_documents_storage_insert on storage.objects;
create policy business_documents_storage_select on storage.objects for select to authenticated using(bucket_id='business-documents' and private.safe_uuid((storage.foldername(name))[1]) is not null and private.can_view_business_documents(private.safe_uuid((storage.foldername(name))[1])));
create policy business_documents_storage_insert on storage.objects for insert to authenticated with check(bucket_id='business-documents' and private.safe_uuid((storage.foldername(name))[1]) is not null and (storage.foldername(name))[2]=(select auth.uid())::text and private.can_manage_business_documents(private.safe_uuid((storage.foldername(name))[1])));

create or replace function private.write_business_document_audit(p_business_id uuid,p_document_id uuid,p_version_id uuid,p_folder_id uuid,p_action text,p_metadata jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
  perform set_config('app.business_document_action','audit',true);
  insert into public.business_document_audit_log(business_id,document_id,version_id,folder_id,action,actor_user_id,metadata)
  values(p_business_id,p_document_id,p_version_id,p_folder_id,p_action,auth.uid(),coalesce(p_metadata,'{}'::jsonb));
end;$$;

create or replace function private.create_business_document_folder_internal(p_business_id uuid,p_name text,p_parent_folder_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare user_id uuid:=auth.uid(); folder_id uuid; normalized_name text:=btrim(coalesce(p_name,''));
begin
  if user_id is null or not private.can_manage_business_documents(p_business_id) then raise exception 'Document management permission required.' using errcode='42501'; end if;
  if char_length(normalized_name) not between 1 and 100 then raise exception 'Folder name must contain 1 to 100 characters.' using errcode='22023'; end if;
  if p_parent_folder_id is not null and not exists(select 1 from public.business_document_folders folder where folder.business_id=p_business_id and folder.id=p_parent_folder_id) then raise exception 'Parent folder not found.' using errcode='P0002'; end if;
  perform set_config('app.business_document_action','folder_create',true);
  insert into public.business_document_folders(business_id,parent_folder_id,name,created_by) values(p_business_id,p_parent_folder_id,normalized_name,user_id) returning id into folder_id;
  perform private.write_business_document_audit(p_business_id,null,null,folder_id,'folder_created',jsonb_build_object('name',normalized_name));
  return jsonb_build_object('folder_id',folder_id,'name',normalized_name);
exception when unique_violation then raise exception 'A folder with this name already exists here.' using errcode='23505';
end;$$;

create or replace function private.prepare_business_document_upload_internal(
  p_business_id uuid,p_document_id uuid,p_title text,p_document_type text,p_folder_id uuid,p_original_file_name text,p_mime_type text,p_size_bytes bigint,
  p_description text default null,p_tags text[] default '{}',p_related_type text default null,p_related_id uuid default null,p_version_notes text default null
)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare
  user_id uuid:=auth.uid(); document_id uuid:=p_document_id; version_id uuid:=gen_random_uuid(); version_number integer;
  normalized_title text:=btrim(coalesce(p_title,'')); normalized_type text:=lower(btrim(coalesce(p_document_type,'general')));
  normalized_file_name text:=btrim(coalesce(p_original_file_name,'')); safe_file_name text;
  normalized_mime text:=lower(btrim(coalesce(p_mime_type,''))); normalized_tags text[]; object_path text;
  is_new boolean:=p_document_id is null; document_row public.business_documents%rowtype; allowed_mimes text[];
begin
  if user_id is null or not private.can_manage_business_documents(p_business_id) then raise exception 'Document management permission required.' using errcode='42501'; end if;
  if char_length(normalized_title) not between 2 and 160 then raise exception 'Document title must contain 2 to 160 characters.' using errcode='22023'; end if;
  if normalized_type not in('general','contract','invoice','receipt','statement','tax','legal','identity','license','certificate','policy','report','other') then raise exception 'Unsupported document type.' using errcode='22023'; end if;
  if char_length(normalized_file_name) not between 1 and 255 then raise exception 'File name is required.' using errcode='22023'; end if;
  if p_size_bytes is null or p_size_bytes<1 or p_size_bytes>26214400 then raise exception 'Document file must be between 1 byte and 25 MB.' using errcode='22023'; end if;
  select bucket.allowed_mime_types into allowed_mimes from storage.buckets bucket where bucket.id='business-documents';
  if normalized_mime='' or not normalized_mime=any(allowed_mimes) then raise exception 'This document file type is not supported.' using errcode='22023'; end if;
  if p_folder_id is not null and not exists(select 1 from public.business_document_folders folder where folder.business_id=p_business_id and folder.id=p_folder_id) then raise exception 'Document folder not found.' using errcode='P0002'; end if;
  if (p_related_type is null)<>(p_related_id is null) then raise exception 'Related record type and ID must be provided together.' using errcode='22023'; end if;
  if p_related_type is not null and p_related_type not in('contact','sales_invoice','supplier_bill','product','journal_entry','crm_lead','crm_opportunity','tax_filing','bank_reconciliation','budget_scenario') then raise exception 'Unsupported related record type.' using errcode='22023'; end if;
  select coalesce(array_agg(distinct lower(btrim(tag))) filter(where btrim(tag)<>''),'{}'::text[]) into normalized_tags from unnest(coalesce(p_tags,'{}'::text[])) tag;
  if cardinality(normalized_tags)>20 or exists(select 1 from unnest(normalized_tags) tag where char_length(tag)>40) then raise exception 'Use no more than 20 tags of 40 characters each.' using errcode='22023'; end if;
  safe_file_name:=left(regexp_replace(lower(normalized_file_name),'[^a-z0-9._-]+','-','g'),180); safe_file_name:=trim(both '-' from safe_file_name); if safe_file_name='' then safe_file_name:='document'; end if;
  if is_new then
    document_id:=gen_random_uuid(); version_number:=1; perform set_config('app.business_document_action','upload_prepare',true);
    insert into public.business_documents(id,business_id,folder_id,title,document_type,description,tags,related_type,related_id,status,created_by,updated_by)
    values(document_id,p_business_id,p_folder_id,normalized_title,normalized_type,nullif(btrim(coalesce(p_description,'')),''),normalized_tags,p_related_type,p_related_id,'active',user_id,user_id);
  else
    select document.* into document_row from public.business_documents document where document.business_id=p_business_id and document.id=p_document_id for update;
    if not found then raise exception 'Document not found.' using errcode='P0002'; end if;
    if document_row.status<>'active' then raise exception 'Archived documents cannot receive new versions.' using errcode='55000'; end if;
    select coalesce(max(version.version_number),0)+1 into version_number from public.business_document_versions version where version.business_id=p_business_id and version.document_id=p_document_id;
    perform set_config('app.business_document_action','version_prepare',true);
    update public.business_documents document set folder_id=p_folder_id,title=normalized_title,document_type=normalized_type,description=nullif(btrim(coalesce(p_description,'')),''),tags=normalized_tags,related_type=p_related_type,related_id=p_related_id,updated_by=user_id where document.business_id=p_business_id and document.id=p_document_id;
  end if;
  object_path:=p_business_id::text||'/'||user_id::text||'/'||document_id::text||'/'||version_id::text||'/'||safe_file_name;
  perform set_config('app.business_document_action',case when is_new then 'upload_prepare' else 'version_prepare' end,true);
  insert into public.business_document_versions(id,business_id,document_id,version_number,object_path,original_file_name,mime_type,size_bytes,version_notes,status,created_by)
  values(version_id,p_business_id,document_id,version_number,object_path,normalized_file_name,normalized_mime,p_size_bytes,nullif(btrim(coalesce(p_version_notes,'')),''),'pending',user_id);
  perform private.write_business_document_audit(p_business_id,document_id,version_id,p_folder_id,case when is_new then 'upload_prepared' else 'version_prepared' end,jsonb_build_object('file_name',normalized_file_name,'mime_type',normalized_mime,'size_bytes',p_size_bytes,'version_number',version_number));
  return jsonb_build_object('document_id',document_id,'version_id',version_id,'version_number',version_number,'bucket_id','business-documents','object_path',object_path,'max_size_bytes',26214400);
end;$$;

create or replace function private.finalize_business_document_upload_internal(p_business_id uuid,p_version_id uuid,p_checksum_sha256 text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private,storage as $$
declare
  user_id uuid:=auth.uid(); version_row public.business_document_versions%rowtype; document_row public.business_documents%rowtype;
  object_row storage.objects%rowtype; actual_size bigint; actual_mime text; checksum text:=lower(nullif(btrim(coalesce(p_checksum_sha256,'')),''));
begin
  if user_id is null or not private.can_manage_business_documents(p_business_id) then raise exception 'Document management permission required.' using errcode='42501'; end if;
  if checksum is not null and checksum !~ '^[a-f0-9]{64}$' then raise exception 'Document checksum is invalid.' using errcode='22023'; end if;
  select version.* into version_row from public.business_document_versions version where version.business_id=p_business_id and version.id=p_version_id for update;
  if not found then raise exception 'Document version not found.' using errcode='P0002'; end if;
  if version_row.status='ready' then return jsonb_build_object('document_id',version_row.document_id,'version_id',version_row.id,'status','ready'); end if;
  if version_row.status<>'pending' then raise exception 'Only pending uploads can be finalized.' using errcode='55000'; end if;
  select document.* into document_row from public.business_documents document where document.business_id=p_business_id and document.id=version_row.document_id for update;
  select object.* into object_row from storage.objects object where object.bucket_id='business-documents' and object.name=version_row.object_path;
  if not found then raise exception 'Uploaded storage object was not found.' using errcode='P0002'; end if;
  if coalesce(object_row.owner,user_id)<>user_id and coalesce(object_row.owner_id,user_id::text)<>user_id::text then raise exception 'Uploaded storage object owner does not match.' using errcode='42501'; end if;
  begin actual_size:=coalesce((object_row.metadata->>'size')::bigint,version_row.size_bytes); exception when invalid_text_representation then actual_size:=version_row.size_bytes; end;
  actual_mime:=lower(coalesce(object_row.metadata->>'mimetype',version_row.mime_type));
  if actual_size<>version_row.size_bytes then raise exception 'Uploaded file size does not match the prepared version.' using errcode='23514'; end if;
  if actual_mime<>version_row.mime_type then raise exception 'Uploaded file type does not match the prepared version.' using errcode='23514'; end if;
  perform set_config('app.business_document_action','finalize',true);
  update public.business_document_versions version set status='ready',checksum_sha256=checksum,uploaded_at=now(),failed_at=null,failure_reason=null where version.business_id=p_business_id and version.id=p_version_id;
  update public.business_documents document set current_version_id=p_version_id,updated_by=user_id where document.business_id=p_business_id and document.id=version_row.document_id;
  perform private.write_business_document_audit(p_business_id,version_row.document_id,p_version_id,document_row.folder_id,case when version_row.version_number=1 then 'upload_completed' else 'version_completed' end,jsonb_build_object('version_number',version_row.version_number,'checksum_sha256',checksum));
  return jsonb_build_object('document_id',version_row.document_id,'version_id',p_version_id,'version_number',version_row.version_number,'status','ready');
end;$$;

create or replace function private.fail_business_document_upload_internal(p_business_id uuid,p_version_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare user_id uuid:=auth.uid(); version_row public.business_document_versions%rowtype; document_row public.business_documents%rowtype; normalized_reason text:=left(btrim(coalesce(p_reason,'Upload failed.')),500);
begin
  if user_id is null or not private.can_manage_business_documents(p_business_id) then raise exception 'Document management permission required.' using errcode='42501'; end if;
  select version.* into version_row from public.business_document_versions version where version.business_id=p_business_id and version.id=p_version_id for update;
  if not found then raise exception 'Document version not found.' using errcode='P0002'; end if; if version_row.status<>'pending' then return false; end if;
  select document.* into document_row from public.business_documents document where document.business_id=p_business_id and document.id=version_row.document_id;
  perform set_config('app.business_document_action','fail',true);
  update public.business_document_versions version set status='failed',failed_at=now(),failure_reason=normalized_reason where version.business_id=p_business_id and version.id=p_version_id;
  perform private.write_business_document_audit(p_business_id,version_row.document_id,p_version_id,document_row.folder_id,'upload_failed',jsonb_build_object('reason',normalized_reason,'version_number',version_row.version_number));
  return true;
end;$$;

create or replace function private.update_business_document_metadata_internal(p_business_id uuid,p_document_id uuid,p_title text,p_document_type text,p_folder_id uuid,p_description text default null,p_tags text[] default '{}',p_related_type text default null,p_related_id uuid default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare user_id uuid:=auth.uid(); document_row public.business_documents%rowtype; normalized_title text:=btrim(coalesce(p_title,'')); normalized_type text:=lower(btrim(coalesce(p_document_type,'general'))); normalized_tags text[];
begin
  if user_id is null or not private.can_manage_business_documents(p_business_id) then raise exception 'Document management permission required.' using errcode='42501'; end if;
  select document.* into document_row from public.business_documents document where document.business_id=p_business_id and document.id=p_document_id for update;
  if not found then raise exception 'Document not found.' using errcode='P0002'; end if;
  if char_length(normalized_title) not between 2 and 160 then raise exception 'Document title is invalid.' using errcode='22023'; end if;
  if normalized_type not in('general','contract','invoice','receipt','statement','tax','legal','identity','license','certificate','policy','report','other') then raise exception 'Unsupported document type.' using errcode='22023'; end if;
  if p_folder_id is not null and not exists(select 1 from public.business_document_folders folder where folder.business_id=p_business_id and folder.id=p_folder_id) then raise exception 'Folder not found.' using errcode='P0002'; end if;
  if (p_related_type is null)<>(p_related_id is null) then raise exception 'Related record type and ID must be provided together.' using errcode='22023'; end if;
  if p_related_type is not null and p_related_type not in('contact','sales_invoice','supplier_bill','product','journal_entry','crm_lead','crm_opportunity','tax_filing','bank_reconciliation','budget_scenario') then raise exception 'Unsupported related record type.' using errcode='22023'; end if;
  select coalesce(array_agg(distinct lower(btrim(tag))) filter(where btrim(tag)<>''),'{}'::text[]) into normalized_tags from unnest(coalesce(p_tags,'{}'::text[])) tag;
  if cardinality(normalized_tags)>20 or exists(select 1 from unnest(normalized_tags) tag where char_length(tag)>40) then raise exception 'Tags are invalid.' using errcode='22023'; end if;
  perform set_config('app.business_document_action','metadata',true);
  update public.business_documents document set folder_id=p_folder_id,title=normalized_title,document_type=normalized_type,description=nullif(btrim(coalesce(p_description,'')),''),tags=normalized_tags,related_type=p_related_type,related_id=p_related_id,updated_by=user_id where document.business_id=p_business_id and document.id=p_document_id;
  perform private.write_business_document_audit(p_business_id,p_document_id,null,p_folder_id,'metadata_updated',jsonb_build_object('title',normalized_title,'document_type',normalized_type));
  return jsonb_build_object('document_id',p_document_id,'status',document_row.status);
end;$$;

create or replace function private.set_business_document_archived_internal(p_business_id uuid,p_document_id uuid,p_archived boolean)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare user_id uuid:=auth.uid(); document_row public.business_documents%rowtype; action_name text:=case when coalesce(p_archived,false) then 'archive' else 'restore' end;
begin
  if user_id is null or not private.can_manage_business_documents(p_business_id) then raise exception 'Document management permission required.' using errcode='42501'; end if;
  select document.* into document_row from public.business_documents document where document.business_id=p_business_id and document.id=p_document_id for update;
  if not found then raise exception 'Document not found.' using errcode='P0002'; end if;
  if coalesce(p_archived,false) and document_row.current_version_id is null then raise exception 'Documents without a completed version cannot be archived.' using errcode='55000'; end if;
  perform set_config('app.business_document_action',action_name,true);
  update public.business_documents document set status=case when coalesce(p_archived,false) then 'archived' else 'active' end,archived_by=case when coalesce(p_archived,false) then user_id else null end,archived_at=case when coalesce(p_archived,false) then now() else null end,updated_by=user_id where document.business_id=p_business_id and document.id=p_document_id;
  perform private.write_business_document_audit(p_business_id,p_document_id,null,document_row.folder_id,case when coalesce(p_archived,false) then 'archived' else 'restored' end,'{}'::jsonb);
  return jsonb_build_object('document_id',p_document_id,'status',case when coalesce(p_archived,false) then 'archived' else 'active' end);
end;$$;

create or replace function private.get_business_documents_snapshot_internal(p_business_id uuid,p_folder_id uuid default null,p_status text default 'active',p_search text default null,p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare normalized_status text:=lower(btrim(coalesce(p_status,'active'))); normalized_search text:=nullif(btrim(coalesce(p_search,'')),''); result jsonb;
begin
  if auth.uid() is null or not private.can_view_business_documents(p_business_id) then raise exception 'Document access required.' using errcode='42501'; end if;
  if normalized_status not in('active','archived','all') then raise exception 'Unsupported document status filter.' using errcode='22023'; end if;
  if p_limit<1 or p_limit>500 then raise exception 'Document limit must be between 1 and 500.' using errcode='22023'; end if;
  if p_folder_id is not null and not exists(select 1 from public.business_document_folders folder where folder.business_id=p_business_id and folder.id=p_folder_id) then raise exception 'Document folder not found.' using errcode='P0002'; end if;
  select jsonb_build_object(
    'business_id',p_business_id,'bucket_id','business-documents','can_manage',private.can_manage_business_documents(p_business_id),
    'selected_folder_id',p_folder_id,'status_filter',normalized_status,
    'folders',coalesce((select jsonb_agg(jsonb_build_object('id',folder.id,'parent_folder_id',folder.parent_folder_id,'name',folder.name,'document_count',(select count(*) from public.business_documents document where document.business_id=folder.business_id and document.folder_id=folder.id and document.status='active'),'created_at',folder.created_at) order by folder.name) from public.business_document_folders folder where folder.business_id=p_business_id),'[]'::jsonb),
    'documents',coalesce((select jsonb_agg(document_json order by updated_at desc,title) from(
      select document.updated_at,document.title,jsonb_build_object(
        'id',document.id,'folder_id',document.folder_id,'folder_name',folder.name,'title',document.title,'document_type',document.document_type,
        'description',document.description,'tags',document.tags,'related_type',document.related_type,'related_id',document.related_id,'status',document.status,
        'current_version_id',document.current_version_id,'created_at',document.created_at,'updated_at',document.updated_at,'archived_at',document.archived_at,
        'version_count',(select count(*) from public.business_document_versions version where version.business_id=document.business_id and version.document_id=document.id and version.status='ready'),
        'pending_version_count',(select count(*) from public.business_document_versions version where version.business_id=document.business_id and version.document_id=document.id and version.status='pending'),
        'current_version',case when current_version.id is null then null else jsonb_build_object('id',current_version.id,'version_number',current_version.version_number,'object_path',current_version.object_path,'original_file_name',current_version.original_file_name,'mime_type',current_version.mime_type,'size_bytes',current_version.size_bytes,'checksum_sha256',current_version.checksum_sha256,'version_notes',current_version.version_notes,'created_at',current_version.created_at,'uploaded_at',current_version.uploaded_at) end,
        'versions',coalesce((select jsonb_agg(jsonb_build_object('id',version.id,'version_number',version.version_number,'object_path',version.object_path,'original_file_name',version.original_file_name,'mime_type',version.mime_type,'size_bytes',version.size_bytes,'checksum_sha256',version.checksum_sha256,'version_notes',version.version_notes,'status',version.status,'created_at',version.created_at,'uploaded_at',version.uploaded_at,'failed_at',version.failed_at,'failure_reason',version.failure_reason) order by version.version_number desc) from public.business_document_versions version where version.business_id=document.business_id and version.document_id=document.id),'[]'::jsonb)
      ) document_json
      from public.business_documents document
      left join public.business_document_folders folder on folder.business_id=document.business_id and folder.id=document.folder_id
      left join public.business_document_versions current_version on current_version.business_id=document.business_id and current_version.id=document.current_version_id
      where document.business_id=p_business_id and (p_folder_id is null or document.folder_id=p_folder_id) and (normalized_status='all' or document.status=normalized_status)
        and (normalized_search is null or document.title ilike '%'||normalized_search||'%' or coalesce(document.description,'') ilike '%'||normalized_search||'%' or exists(select 1 from unnest(document.tags) tag where tag ilike '%'||normalized_search||'%') or coalesce(current_version.original_file_name,'') ilike '%'||normalized_search||'%')
      order by document.updated_at desc,document.title limit p_limit
    ) documents),'[]'::jsonb),
    'summary',jsonb_build_object(
      'active_documents',(select count(*) from public.business_documents document where document.business_id=p_business_id and document.status='active' and document.current_version_id is not null),
      'archived_documents',(select count(*) from public.business_documents document where document.business_id=p_business_id and document.status='archived'),
      'pending_uploads',(select count(*) from public.business_document_versions version where version.business_id=p_business_id and version.status='pending'),
      'storage_bytes',(select coalesce(sum(version.size_bytes),0) from public.business_document_versions version where version.business_id=p_business_id and version.status='ready'),
      'folders',(select count(*) from public.business_document_folders folder where folder.business_id=p_business_id)
    ),
    'audit',coalesce((select jsonb_agg(jsonb_build_object('id',audit.id,'document_id',audit.document_id,'version_id',audit.version_id,'folder_id',audit.folder_id,'action',audit.action,'actor_user_id',audit.actor_user_id,'metadata',audit.metadata,'created_at',audit.created_at) order by audit.created_at desc,audit.id desc) from(select * from public.business_document_audit_log audit where audit.business_id=p_business_id order by audit.created_at desc,audit.id desc limit 100) audit),'[]'::jsonb)
  ) into result; return result;
end;$$;

create or replace function public.create_business_document_folder(p_business_id uuid,p_name text,p_parent_folder_id uuid default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.create_business_document_folder_internal(p_business_id,p_name,p_parent_folder_id);$$;
create or replace function public.prepare_business_document_upload(p_business_id uuid,p_document_id uuid,p_title text,p_document_type text,p_folder_id uuid,p_original_file_name text,p_mime_type text,p_size_bytes bigint,p_description text default null,p_tags text[] default '{}',p_related_type text default null,p_related_id uuid default null,p_version_notes text default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.prepare_business_document_upload_internal(p_business_id,p_document_id,p_title,p_document_type,p_folder_id,p_original_file_name,p_mime_type,p_size_bytes,p_description,p_tags,p_related_type,p_related_id,p_version_notes);$$;
create or replace function public.finalize_business_document_upload(p_business_id uuid,p_version_id uuid,p_checksum_sha256 text default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.finalize_business_document_upload_internal(p_business_id,p_version_id,p_checksum_sha256);$$;
create or replace function public.fail_business_document_upload(p_business_id uuid,p_version_id uuid,p_reason text)
returns boolean language sql set search_path=pg_catalog,public,private as $$select private.fail_business_document_upload_internal(p_business_id,p_version_id,p_reason);$$;
create or replace function public.update_business_document_metadata(p_business_id uuid,p_document_id uuid,p_title text,p_document_type text,p_folder_id uuid,p_description text default null,p_tags text[] default '{}',p_related_type text default null,p_related_id uuid default null)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.update_business_document_metadata_internal(p_business_id,p_document_id,p_title,p_document_type,p_folder_id,p_description,p_tags,p_related_type,p_related_id);$$;
create or replace function public.set_business_document_archived(p_business_id uuid,p_document_id uuid,p_archived boolean)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.set_business_document_archived_internal(p_business_id,p_document_id,p_archived);$$;
create or replace function public.get_business_documents_snapshot(p_business_id uuid,p_folder_id uuid default null,p_status text default 'active',p_search text default null,p_limit integer default 100)
returns jsonb language sql stable set search_path=pg_catalog,public,private as $$select private.get_business_documents_snapshot_internal(p_business_id,p_folder_id,p_status,p_search,p_limit);$$;

revoke all on function private.enforce_business_document_engine_write() from public,anon,authenticated;
revoke all on function private.write_business_document_audit(uuid,uuid,uuid,uuid,text,jsonb) from public,anon;
revoke all on function private.create_business_document_folder_internal(uuid,text,uuid) from public,anon;
revoke all on function private.prepare_business_document_upload_internal(uuid,uuid,text,text,uuid,text,text,bigint,text,text[],text,uuid,text) from public,anon;
revoke all on function private.finalize_business_document_upload_internal(uuid,uuid,text) from public,anon;
revoke all on function private.fail_business_document_upload_internal(uuid,uuid,text) from public,anon;
revoke all on function private.update_business_document_metadata_internal(uuid,uuid,text,text,uuid,text,text[],text,uuid) from public,anon;
revoke all on function private.set_business_document_archived_internal(uuid,uuid,boolean) from public,anon;
revoke all on function private.get_business_documents_snapshot_internal(uuid,uuid,text,text,integer) from public,anon;
grant execute on function private.create_business_document_folder_internal(uuid,text,uuid) to authenticated;
grant execute on function private.prepare_business_document_upload_internal(uuid,uuid,text,text,uuid,text,text,bigint,text,text[],text,uuid,text) to authenticated;
grant execute on function private.finalize_business_document_upload_internal(uuid,uuid,text) to authenticated;
grant execute on function private.fail_business_document_upload_internal(uuid,uuid,text) to authenticated;
grant execute on function private.update_business_document_metadata_internal(uuid,uuid,text,text,uuid,text,text[],text,uuid) to authenticated;
grant execute on function private.set_business_document_archived_internal(uuid,uuid,boolean) to authenticated;
grant execute on function private.get_business_documents_snapshot_internal(uuid,uuid,text,text,integer) to authenticated;
revoke all on function public.create_business_document_folder(uuid,text,uuid) from public,anon;
revoke all on function public.prepare_business_document_upload(uuid,uuid,text,text,uuid,text,text,bigint,text,text[],text,uuid,text) from public,anon;
revoke all on function public.finalize_business_document_upload(uuid,uuid,text) from public,anon;
revoke all on function public.fail_business_document_upload(uuid,uuid,text) from public,anon;
revoke all on function public.update_business_document_metadata(uuid,uuid,text,text,uuid,text,text[],text,uuid) from public,anon;
revoke all on function public.set_business_document_archived(uuid,uuid,boolean) from public,anon;
revoke all on function public.get_business_documents_snapshot(uuid,uuid,text,text,integer) from public,anon;
grant execute on function public.create_business_document_folder(uuid,text,uuid) to authenticated;
grant execute on function public.prepare_business_document_upload(uuid,uuid,text,text,uuid,text,text,bigint,text,text[],text,uuid,text) to authenticated;
grant execute on function public.finalize_business_document_upload(uuid,uuid,text) to authenticated;
grant execute on function public.fail_business_document_upload(uuid,uuid,text) to authenticated;
grant execute on function public.update_business_document_metadata(uuid,uuid,text,text,uuid,text,text[],text,uuid) to authenticated;
grant execute on function public.set_business_document_archived(uuid,uuid,boolean) to authenticated;
grant execute on function public.get_business_documents_snapshot(uuid,uuid,text,text,integer) to authenticated;
