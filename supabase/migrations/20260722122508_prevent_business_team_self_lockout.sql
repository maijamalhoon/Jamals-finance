do $$
declare definition text; target text; replacement text;
begin
 select pg_get_functiondef(p.oid) into definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname='update_business_team_member_internal' limit 1;
 target:=$q$ normalized_permissions:=private.normalize_business_team_permissions(p_permissions);
 if actor_id<>owner_id$q$;
 replacement:=$q$ normalized_permissions:=private.normalize_business_team_permissions(p_permissions);
 if actor_id=p_user_id and normalized_status<>'active' then raise exception 'Another owner or admin must suspend or remove your access.' using errcode='42501'; end if;
 if actor_id<>owner_id$q$;
 if position(target in definition)=0 then raise exception 'Team self-lockout patch target not found.'; end if;
 execute replace(definition,target,replacement);
end $$;
