do $$
declare definition text;
begin
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='create_business_invitation_internal' limit 1;
  if position($q$raw_token:=encode(gen_random_bytes(32),'hex')$q$ in definition)=0 then raise exception 'Create invitation token target not found.'; end if;
  execute replace(definition,$q$raw_token:=encode(gen_random_bytes(32),'hex')$q$,$q$raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')$q$);
  select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='resend_business_invitation_internal' limit 1;
  if position($q$raw_token:=encode(gen_random_bytes(32),'hex')$q$ in definition)=0 then raise exception 'Resend invitation token target not found.'; end if;
  execute replace(definition,$q$raw_token:=encode(gen_random_bytes(32),'hex')$q$,$q$raw_token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','')$q$);
end $$;
