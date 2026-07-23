create or replace function private.post_business_fx_revaluation_run_internal(p_business_id uuid,p_run_id uuid)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor uuid:=auth.uid();run_record public.business_fx_revaluation_runs%rowtype;settings public.business_fx_settings%rowtype;v_base text;lines jsonb:='[]'::jsonb;item record;v_journal uuid;
begin
  if actor is null or not private.can_revalue_business_fx(p_business_id) then raise exception 'FX revaluation permission required.' using errcode='42501';end if;
  perform private.recalculate_business_fx_revaluation_run_internal(p_business_id,p_run_id);
  select * into run_record from public.business_fx_revaluation_runs where business_id=p_business_id and id=p_run_id for update;
  if run_record.status<>'draft' then raise exception 'Only draft FX revaluation runs can be posted.' using errcode='55000';end if;
  if run_record.exposure_count=0 or run_record.total_gain_base+run_record.total_loss_base<=0 then raise exception 'This FX revaluation has no posting adjustment.' using errcode='22023';end if;
  select * into settings from public.business_fx_settings where business_id=p_business_id;
  select base_currency into v_base from public.businesses where id=p_business_id;
  for item in select account_id,sum(case when exposure_type in('sales_receivable','bank_balance') then adjustment_base else -adjustment_base end)::numeric(24,6) account_adjustment from public.business_fx_revaluation_lines where business_id=p_business_id and revaluation_run_id=p_run_id group by account_id having sum(case when exposure_type in('sales_receivable','bank_balance') then adjustment_base else -adjustment_base end)<>0 order by account_id loop
    if item.account_adjustment>0 then lines:=lines||jsonb_build_array(jsonb_build_object('account_id',item.account_id,'debit',item.account_adjustment,'credit',0,'description','FX revaluation adjustment'));
    else lines:=lines||jsonb_build_array(jsonb_build_object('account_id',item.account_id,'debit',0,'credit',-item.account_adjustment,'description','FX revaluation adjustment'));end if;
  end loop;
  if run_record.total_loss_base>0 then lines:=lines||jsonb_build_array(jsonb_build_object('account_id',settings.unrealized_loss_account_id,'debit',run_record.total_loss_base,'credit',0,'description','Unrealized foreign exchange loss'));end if;
  if run_record.total_gain_base>0 then lines:=lines||jsonb_build_array(jsonb_build_object('account_id',settings.unrealized_gain_account_id,'debit',0,'credit',run_record.total_gain_base,'description','Unrealized foreign exchange gain'));end if;
  v_journal:=private.post_business_fx_controlled_journal(p_business_id,run_record.closing_date,'fx_revaluation',p_run_id,run_record.run_code,'Foreign exchange revaluation '||run_record.run_code,v_base,1,lines);
  update public.business_fx_revaluation_runs set status='posted',journal_entry_id=v_journal,posted_by=actor,posted_at=now(),updated_at=now() where business_id=p_business_id and id=p_run_id;
  perform private.write_business_fx_audit(p_business_id,null,p_run_id,'revaluation_posted',jsonb_build_object('journal_entry_id',v_journal,'gain_base',run_record.total_gain_base,'loss_base',run_record.total_loss_base));
  return jsonb_build_object('id',p_run_id,'status','posted','journal_entry_id',v_journal,'total_gain_base',run_record.total_gain_base,'total_loss_base',run_record.total_loss_base);
end;
$$;

create or replace function public.post_business_fx_revaluation_run(p_business_id uuid,p_run_id uuid)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.post_business_fx_revaluation_run_internal(p_business_id,p_run_id);$$;

create or replace function private.reverse_business_fx_revaluation_run_internal(p_business_id uuid,p_run_id uuid,p_reversal_date date)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor uuid:=auth.uid();run_record public.business_fx_revaluation_runs%rowtype;v_base text;lines jsonb;v_journal uuid;
begin
  if actor is null or not private.can_revalue_business_fx(p_business_id) then raise exception 'FX revaluation permission required.' using errcode='42501';end if;
  select * into run_record from public.business_fx_revaluation_runs where business_id=p_business_id and id=p_run_id for update;
  if not found then raise exception 'FX revaluation run not found.' using errcode='P0002';end if;
  if run_record.status<>'posted' then raise exception 'Only a posted FX revaluation can be reversed.' using errcode='55000';end if;
  if p_reversal_date is null or p_reversal_date<=run_record.closing_date then raise exception 'Reversal date must be after the closing date.' using errcode='22008';end if;
  select base_currency into v_base from public.businesses where id=p_business_id;
  select jsonb_agg(jsonb_build_object('account_id',line.account_id,'debit',line.credit_base,'credit',line.debit_base,'description','Reversal: '||coalesce(line.description,'FX revaluation')) order by line.line_number) into lines from public.business_journal_lines line where line.business_id=p_business_id and line.journal_entry_id=run_record.journal_entry_id;
  v_journal:=private.post_business_fx_controlled_journal(p_business_id,p_reversal_date,'fx_revaluation_reversal',p_run_id,run_record.run_code||'-REV','Reversal of foreign exchange revaluation '||run_record.run_code,v_base,1,lines);
  update public.business_fx_revaluation_runs set status='reversed',reversal_journal_entry_id=v_journal,reversal_date=p_reversal_date,reversed_by=actor,reversed_at=now(),updated_at=now() where business_id=p_business_id and id=p_run_id;
  perform private.write_business_fx_audit(p_business_id,null,p_run_id,'revaluation_reversed',jsonb_build_object('reversal_journal_entry_id',v_journal,'reversal_date',p_reversal_date));
  return jsonb_build_object('id',p_run_id,'status','reversed','reversal_journal_entry_id',v_journal,'reversal_date',p_reversal_date);
end;
$$;

create or replace function public.reverse_business_fx_revaluation_run(p_business_id uuid,p_run_id uuid,p_reversal_date date)
returns jsonb language sql set search_path=pg_catalog,public,private as $$select private.reverse_business_fx_revaluation_run_internal(p_business_id,p_run_id,p_reversal_date);$$;
