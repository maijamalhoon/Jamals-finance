create or replace function private.cancel_business_fx_revaluation_run_internal(p_business_id uuid,p_run_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private
as $$
begin
  if auth.uid() is null or not private.can_revalue_business_fx(p_business_id) then raise exception 'FX revaluation permission required.' using errcode='42501';end if;
  if not exists(select 1 from public.business_fx_revaluation_runs where business_id=p_business_id and id=p_run_id and status='draft' for update) then raise exception 'Only a draft FX revaluation can be cancelled.' using errcode='55000';end if;
  delete from public.business_fx_revaluation_lines where business_id=p_business_id and revaluation_run_id=p_run_id;
  update public.business_fx_revaluation_runs set status='cancelled',exposure_count=0,skipped_bank_count=0,total_gain_base=0,total_loss_base=0,cancelled_by=auth.uid(),cancelled_at=now(),updated_at=now() where business_id=p_business_id and id=p_run_id;
  perform private.write_business_fx_audit(p_business_id,null,p_run_id,'revaluation_cancelled','{}'::jsonb);
end;
$$;

create or replace function public.cancel_business_fx_revaluation_run(p_business_id uuid,p_run_id uuid)
returns void language sql set search_path=pg_catalog,public,private
as $$select private.cancel_business_fx_revaluation_run_internal(p_business_id,p_run_id);$$;

revoke execute on function private.create_business_fx_revaluation_run_internal(uuid,date,text),private.recalculate_business_fx_revaluation_run_internal(uuid,uuid),private.post_business_fx_revaluation_run_internal(uuid,uuid),private.reverse_business_fx_revaluation_run_internal(uuid,uuid,date),private.cancel_business_fx_revaluation_run_internal(uuid,uuid) from public,anon;
grant execute on function private.create_business_fx_revaluation_run_internal(uuid,date,text),private.recalculate_business_fx_revaluation_run_internal(uuid,uuid),private.post_business_fx_revaluation_run_internal(uuid,uuid),private.reverse_business_fx_revaluation_run_internal(uuid,uuid,date),private.cancel_business_fx_revaluation_run_internal(uuid,uuid) to authenticated;
grant execute on function public.create_business_fx_revaluation_run(uuid,date,text),public.recalculate_business_fx_revaluation_run(uuid,uuid),public.post_business_fx_revaluation_run(uuid,uuid),public.reverse_business_fx_revaluation_run(uuid,uuid,date),public.cancel_business_fx_revaluation_run(uuid,uuid) to authenticated;
