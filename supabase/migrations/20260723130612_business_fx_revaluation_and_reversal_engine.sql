alter table public.business_fx_revaluation_runs
  add column if not exists skipped_bank_count integer not null default 0 check(skipped_bank_count>=0);
alter table public.business_fx_revaluation_lines alter column rate_id set not null;

create unique index if not exists business_fx_revaluation_journal_source_idx
  on public.business_journal_entries(business_id,source_type,source_id)
  where source_type in ('fx_revaluation','fx_revaluation_reversal');

create or replace function private.create_business_fx_revaluation_run_internal(
  p_business_id uuid,p_closing_date date,p_notes text
) returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private
as $$
declare actor uuid:=auth.uid();v_number bigint;v_id uuid;v_code text;existing public.business_fx_revaluation_runs%rowtype;
begin
  if actor is null or not private.can_revalue_business_fx(p_business_id) then raise exception 'FX revaluation permission required.' using errcode='42501';end if;
  if p_closing_date is null or p_closing_date>current_date then raise exception 'Closing date cannot be in the future.' using errcode='22008';end if;
  if exists(select 1 from public.business_fx_revaluation_runs where business_id=p_business_id and status='posted') then raise exception 'Reverse the active FX revaluation before creating another run.' using errcode='55000';end if;
  select * into existing from public.business_fx_revaluation_runs where business_id=p_business_id and closing_date=p_closing_date for update;
  if found then
    if existing.status='cancelled' then
      update public.business_fx_revaluation_runs set status='draft',exposure_count=0,skipped_bank_count=0,total_gain_base=0,total_loss_base=0,notes=nullif(btrim(coalesce(p_notes,'')),''),cancelled_by=null,cancelled_at=null,updated_at=now() where business_id=p_business_id and id=existing.id;
      perform private.write_business_fx_audit(p_business_id,null,existing.id,'revaluation_reopened',jsonb_build_object('closing_date',p_closing_date));
      return jsonb_build_object('id',existing.id,'run_code',existing.run_code,'closing_date',p_closing_date,'status','draft');
    end if;
    raise exception 'An FX revaluation run already exists for this closing date.' using errcode='23505';
  end if;
  update public.business_fx_settings set next_revaluation_number=next_revaluation_number+1,updated_by=actor,updated_at=now() where business_id=p_business_id returning next_revaluation_number-1 into v_number;
  if v_number is null then raise exception 'FX settings are missing.' using errcode='23503';end if;
  v_code:='FXR-'||lpad(v_number::text,6,'0');
  insert into public.business_fx_revaluation_runs(business_id,run_number,run_code,closing_date,notes,created_by)
  values(p_business_id,v_number,v_code,p_closing_date,nullif(btrim(coalesce(p_notes,'')),''),actor) returning id into v_id;
  perform private.write_business_fx_audit(p_business_id,null,v_id,'revaluation_created',jsonb_build_object('closing_date',p_closing_date,'run_code',v_code));
  return jsonb_build_object('id',v_id,'run_code',v_code,'closing_date',p_closing_date,'status','draft');
end;
$$;

create or replace function public.create_business_fx_revaluation_run(p_business_id uuid,p_closing_date date,p_notes text default null)
returns jsonb language sql set search_path=pg_catalog,public,private
as $$select private.create_business_fx_revaluation_run_internal(p_business_id,p_closing_date,p_notes);$$;

-- Calculation, posting, reversal, and cancellation continue in later versioned migrations.
