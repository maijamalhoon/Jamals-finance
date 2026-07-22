do $$
declare fn text; definition text;
begin
 foreach fn in array array['create_business_invitation_internal','resend_business_invitation_internal','accept_business_invitation_internal'] loop
   select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname=fn limit 1;
   if position('digest(' in definition)=0 then raise exception 'Digest target missing for %',fn; end if;
   execute replace(definition,'digest(','extensions.digest(');
 end loop;
end $$;
