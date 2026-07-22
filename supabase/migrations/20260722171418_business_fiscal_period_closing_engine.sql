alter table public.business_fiscal_periods
  add column close_journal_entry_id uuid,
  add column reopen_journal_entry_id uuid,
  add column closing_net_income_base numeric(24,6),
  add column closing_snapshot jsonb not null default '{}'::jsonb,
  add column close_notes text,
  add column reopened_by uuid references auth.users(id) on delete set null,
  add column reopened_at timestamptz,
  add constraint business_fiscal_periods_close_notes_check check(close_notes is null or char_length(close_notes)<=2000),
  add foreign key(business_id,close_journal_entry_id) references public.business_journal_entries(business_id,id) on delete restrict,
  add foreign key(business_id,reopen_journal_entry_id) references public.business_journal_entries(business_id,id) on delete restrict;

create index business_fiscal_periods_close_journal_idx on public.business_fiscal_periods(business_id,close_journal_entry_id) where close_journal_entry_id is not null;
create index business_fiscal_periods_reopen_journal_idx on public.business_fiscal_periods(business_id,reopen_journal_entry_id) where reopen_journal_entry_id is not null;
create index business_fiscal_periods_reopened_by_idx on public.business_fiscal_periods(reopened_by) where reopened_by is not null;

create table public.business_period_close_runs(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  fiscal_period_id uuid not null,
  action text not null,
  journal_entry_id uuid,
  related_journal_entry_id uuid,
  net_income_base numeric(24,6),
  snapshot jsonb not null default '{}'::jsonb,
  notes text,
  performed_by uuid not null references auth.users(id) on delete restrict,
  performed_at timestamptz not null default now(),
  check(action in('close','lock','reopen')),
  check(notes is null or char_length(notes)<=2000),
  foreign key(business_id,fiscal_period_id) references public.business_fiscal_periods(business_id,id) on delete cascade,
  foreign key(business_id,journal_entry_id) references public.business_journal_entries(business_id,id) on delete restrict,
  foreign key(business_id,related_journal_entry_id) references public.business_journal_entries(business_id,id) on delete restrict
);
create index business_period_close_runs_period_idx on public.business_period_close_runs(business_id,fiscal_period_id,performed_at desc);
create index business_period_close_runs_actor_idx on public.business_period_close_runs(performed_by,performed_at desc);
alter table public.business_period_close_runs enable row level security;
create policy business_period_close_runs_select on public.business_period_close_runs for select to authenticated
using((select private.can_view_business_tax(business_id)));
grant select on public.business_period_close_runs to authenticated;
revoke all on public.business_period_close_runs from anon;

create or replace function private.enforce_business_fiscal_period_engine_state()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare transition text:=coalesce(current_setting('app.business_period_transition',true),'');
begin
  if tg_op='INSERT' then
    if new.status<>'open' or new.closed_at is not null or new.locked_at is not null
      or new.close_journal_entry_id is not null or new.reopen_journal_entry_id is not null then
      raise exception 'New fiscal periods must start open.' using errcode='23514';
    end if;
    return new;
  end if;
  if new.business_id<>old.business_id or new.starts_on<>old.starts_on or new.ends_on<>old.ends_on then
    raise exception 'Fiscal period tenant and dates are immutable.' using errcode='23514';
  end if;
  if new.status is distinct from old.status or new.closed_by is distinct from old.closed_by
    or new.closed_at is distinct from old.closed_at or new.locked_at is distinct from old.locked_at
    or new.close_journal_entry_id is distinct from old.close_journal_entry_id
    or new.reopen_journal_entry_id is distinct from old.reopen_journal_entry_id
    or new.closing_net_income_base is distinct from old.closing_net_income_base
    or new.closing_snapshot is distinct from old.closing_snapshot
    or new.close_notes is distinct from old.close_notes
    or new.reopened_by is distinct from old.reopened_by or new.reopened_at is distinct from old.reopened_at then
    if transition not in('close','lock','reopen') then
      raise exception 'Fiscal period state is managed by the closing engine.' using errcode='55000';
    end if;
  end if;
  if transition='close' and not(old.status='open' and new.status='closed') then
    raise exception 'Invalid fiscal close transition.' using errcode='55000';
  elsif transition='lock' and not(old.status='closed' and new.status='locked') then
    raise exception 'Invalid fiscal lock transition.' using errcode='55000';
  elsif transition='reopen' and not(old.status='closed' and new.status='open') and new.status is distinct from old.status then
    raise exception 'Invalid fiscal reopen transition.' using errcode='55000';
  end if;
  return new;
end$$;
revoke all on function private.enforce_business_fiscal_period_engine_state() from public,anon,authenticated;
create trigger business_fiscal_periods_enforce_engine_state before insert or update on public.business_fiscal_periods
for each row execute function private.enforce_business_fiscal_period_engine_state();

create or replace function private.close_business_fiscal_period_internal(p_business_id uuid,p_fiscal_period_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare
  u uuid:=auth.uid();p public.business_fiscal_periods%rowtype;base_currency text;retained_id uuid;
  rec record;diff numeric(24,6);debits numeric(24,6):=0;credits numeric(24,6):=0;net_income numeric(24,6):=0;
  lines jsonb:='[]'::jsonb;account_snapshot jsonb:='[]'::jsonb;entry_id uuid;line_item jsonb;line_no smallint:=0;
  restore_ids uuid[]:='{}'::uuid[];next_start date;next_end date;next_name text;snapshot jsonb;
begin
  if u is null then raise exception 'Authentication required.' using errcode='42501';end if;
  if not private.can_manage_business_tax(p_business_id) then raise exception 'Accounting close permission required.' using errcode='42501';end if;
  select * into p from public.business_fiscal_periods where id=p_fiscal_period_id and business_id=p_business_id for update;
  if not found then raise exception 'Fiscal period not found.' using errcode='P0002';end if;
  if p.status<>'open' then raise exception 'Only an open fiscal period can be closed.' using errcode='55000';end if;
  if exists(select 1 from public.business_journal_entries where business_id=p_business_id and fiscal_period_id=p.id and status='draft') then
    raise exception 'Draft journals must be posted or removed before closing.' using errcode='55000';
  end if;
  select b.base_currency into base_currency from public.businesses b where b.id=p_business_id and b.status='active';
  select id into retained_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='retained_earnings' and is_active;
  if base_currency is null or retained_id is null then raise exception 'Accounting close accounts are incomplete.' using errcode='23503';end if;

  for rec in
    select a.id,a.code,a.name,a.account_type,coalesce(sum(l.debit_base) filter(where e.id is not null),0)::numeric(24,6) debit_total,
      coalesce(sum(l.credit_base) filter(where e.id is not null),0)::numeric(24,6) credit_total
    from public.business_chart_of_accounts a
    left join public.business_journal_lines l on l.business_id=a.business_id and l.account_id=a.id
    left join public.business_journal_entries e on e.business_id=l.business_id and e.id=l.journal_entry_id
      and e.fiscal_period_id=p.id and e.status in('posted','reversed')
    where a.business_id=p_business_id and a.is_active and a.account_type in('revenue','expense')
    group by a.id,a.code,a.name,a.account_type order by a.code
  loop
    diff:=round(rec.credit_total-rec.debit_total,6);
    if abs(diff)>0.000001 then
      if diff>0 then
        lines:=lines||jsonb_build_array(jsonb_build_object('account_id',rec.id,'description','Close '||rec.name,'debit',diff,'credit',0));
        debits:=debits+diff;
      else
        lines:=lines||jsonb_build_array(jsonb_build_object('account_id',rec.id,'description','Close '||rec.name,'debit',0,'credit',-diff));
        credits:=credits-diff;
      end if;
      account_snapshot:=account_snapshot||jsonb_build_array(jsonb_build_object('account_id',rec.id,'code',rec.code,'name',rec.name,'account_type',rec.account_type,'debit_total',rec.debit_total,'credit_total',rec.credit_total,'closing_difference',diff));
    end if;
  end loop;
  net_income:=round(debits-credits,6);
  if net_income>0 then
    lines:=lines||jsonb_build_array(jsonb_build_object('account_id',retained_id,'description','Transfer profit to retained earnings','debit',0,'credit',net_income));credits:=credits+net_income;
  elsif net_income<0 then
    lines:=lines||jsonb_build_array(jsonb_build_object('account_id',retained_id,'description','Transfer loss to retained earnings','debit',-net_income,'credit',0));debits:=debits-net_income;
  end if;
  if abs(debits-credits)>0.000001 then raise exception 'Closing journal did not balance.' using errcode='23514';end if;

  snapshot:=jsonb_build_object('period_id',p.id,'period_name',p.name,'starts_on',p.starts_on,'ends_on',p.ends_on,
    'base_currency',base_currency,'net_income_base',net_income,'closing_debit_base',debits,'closing_credit_base',credits,
    'account_closures',account_snapshot,'closed_at',now());

  if jsonb_array_length(lines)>0 then
    perform 1 from public.business_chart_of_accounts a where a.business_id=p_business_id and a.is_active
      and (a.account_type in('revenue','expense') or a.system_key='retained_earnings') for update;
    select coalesce(array_agg(a.id),'{}'::uuid[]) into restore_ids from public.business_chart_of_accounts a
      where a.business_id=p_business_id and a.is_active and not a.allow_manual_posting
        and (a.account_type in('revenue','expense') or a.system_key='retained_earnings');
    update public.business_chart_of_accounts set allow_manual_posting=true
      where business_id=p_business_id and is_active and (account_type in('revenue','expense') or system_key='retained_earnings');
    insert into public.business_journal_entries(business_id,entry_date,fiscal_period_id,source_type,source_id,reference,description,status,transaction_currency,exchange_rate,created_by)
    values(p_business_id,p.ends_on,p.id,'manual',p.id,'CLOSE-'||p.name,'Close '||p.name||' to retained earnings','draft',base_currency,1,u)
    returning id into entry_id;
    for line_item in select value from jsonb_array_elements(lines) loop
      line_no:=line_no+1;
      insert into public.business_journal_lines(business_id,journal_entry_id,line_number,account_id,description,debit_transaction,credit_transaction)
      values(p_business_id,entry_id,line_no,(line_item->>'account_id')::uuid,line_item->>'description',(line_item->>'debit')::numeric,(line_item->>'credit')::numeric);
    end loop;
    update public.business_journal_entries set source_type='period_close',source_id=p.id where id=entry_id and business_id=p_business_id;
    if cardinality(restore_ids)>0 then update public.business_chart_of_accounts set allow_manual_posting=false where business_id=p_business_id and id=any(restore_ids);end if;
    update public.business_journal_entries set status='posted' where id=entry_id and business_id=p_business_id;
  end if;

  perform set_config('app.business_period_transition','close',true);
  update public.business_fiscal_periods set status='closed',closed_by=u,closed_at=now(),locked_at=null,
    close_journal_entry_id=entry_id,reopen_journal_entry_id=null,closing_net_income_base=net_income,
    closing_snapshot=snapshot,close_notes=nullif(btrim(coalesce(p_notes,'')),''),reopened_by=null,reopened_at=null
  where id=p.id and business_id=p_business_id;

  next_start:=p.ends_on+1;next_end:=next_start+(p.ends_on-p.starts_on);
  next_name:=case when (p.ends_on-p.starts_on) between 364 and 365 then format('FY %s-%s',to_char(next_start,'YYYY'),to_char(next_end,'YYYY'))
    else format('Period %s to %s',to_char(next_start,'YYYY-MM-DD'),to_char(next_end,'YYYY-MM-DD')) end;
  if not exists(select 1 from public.business_fiscal_periods x where x.business_id=p_business_id and next_start between x.starts_on and x.ends_on) then
    insert into public.business_fiscal_periods(business_id,name,starts_on,ends_on,status) values(p_business_id,next_name,next_start,next_end,'open');
  end if;
  insert into public.business_period_close_runs(business_id,fiscal_period_id,action,journal_entry_id,net_income_base,snapshot,notes,performed_by)
  values(p_business_id,p.id,'close',entry_id,net_income,snapshot,nullif(btrim(coalesce(p_notes,'')),''),u);
  return jsonb_build_object('period_id',p.id,'status','closed','close_journal_entry_id',entry_id,'net_income_base',net_income,'snapshot',snapshot);
end$$;

create or replace function private.lock_business_fiscal_period_internal(p_business_id uuid,p_fiscal_period_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare u uuid:=auth.uid();p public.business_fiscal_periods%rowtype;snap jsonb;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501';end if;
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Accounting lock permission required.' using errcode='42501';end if;
 select * into p from public.business_fiscal_periods where id=p_fiscal_period_id and business_id=p_business_id for update;
 if not found then raise exception 'Fiscal period not found.' using errcode='P0002';end if;
 if p.status<>'closed' then raise exception 'Only a closed fiscal period can be locked.' using errcode='55000';end if;
 if exists(select 1 from public.business_tax_filings f where f.business_id=p_business_id and f.status='draft' and f.period_start<=p.ends_on and f.period_end>=p.starts_on) then
   raise exception 'Overlapping draft tax filings must be filed or voided before locking.' using errcode='55000';
 end if;
 snap:=jsonb_build_object('period_id',p.id,'period_name',p.name,'close_journal_entry_id',p.close_journal_entry_id,'net_income_base',p.closing_net_income_base,'locked_at',now());
 perform set_config('app.business_period_transition','lock',true);
 update public.business_fiscal_periods set status='locked',locked_at=now(),close_notes=coalesce(nullif(btrim(coalesce(p_notes,'')),''),close_notes) where id=p.id and business_id=p_business_id;
 insert into public.business_period_close_runs(business_id,fiscal_period_id,action,journal_entry_id,net_income_base,snapshot,notes,performed_by)
 values(p_business_id,p.id,'lock',p.close_journal_entry_id,p.closing_net_income_base,snap,nullif(btrim(coalesce(p_notes,'')),''),u);
 return jsonb_build_object('period_id',p.id,'status','locked','snapshot',snap);
end$$;

create or replace function private.reopen_business_fiscal_period_internal(p_business_id uuid,p_fiscal_period_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare u uuid:=auth.uid();p public.business_fiscal_periods%rowtype;base_currency text;reversal_id uuid;rec record;
 lines jsonb:='[]'::jsonb;line_item jsonb;line_no smallint:=0;restore_ids uuid[]:='{}'::uuid[];snap jsonb;
begin
 if u is null then raise exception 'Authentication required.' using errcode='42501';end if;
 if not private.can_manage_business_tax(p_business_id) then raise exception 'Accounting reopen permission required.' using errcode='42501';end if;
 select * into p from public.business_fiscal_periods where id=p_fiscal_period_id and business_id=p_business_id for update;
 if not found then raise exception 'Fiscal period not found.' using errcode='P0002';end if;
 if p.status<>'closed' then raise exception 'Only a closed, unlocked fiscal period can be reopened.' using errcode='55000';end if;
 if exists(select 1 from public.business_journal_entries e where e.business_id=p_business_id and e.status in('posted','reversed') and e.entry_date>p.ends_on) then
   raise exception 'Later posted activity exists. Reverse or close later activity before reopening this period.' using errcode='55000';
 end if;
 select base_currency into base_currency from public.businesses where id=p_business_id and status='active';
 perform set_config('app.business_period_transition','reopen',true);
 update public.business_fiscal_periods set status='open',closed_by=null,closed_at=null,locked_at=null,reopened_by=u,reopened_at=now() where id=p.id and business_id=p_business_id;

 if p.close_journal_entry_id is not null then
   for rec in select l.account_id,l.description,l.debit_transaction,l.credit_transaction
     from public.business_journal_lines l where l.business_id=p_business_id and l.journal_entry_id=p.close_journal_entry_id order by l.line_number
   loop
     lines:=lines||jsonb_build_array(jsonb_build_object('account_id',rec.account_id,'description','Reverse fiscal close','debit',rec.credit_transaction,'credit',rec.debit_transaction));
   end loop;
   perform 1 from public.business_chart_of_accounts a where a.business_id=p_business_id and a.id in(select (x.value->>'account_id')::uuid from jsonb_array_elements(lines) as x(value)) for update;
   select coalesce(array_agg(a.id),'{}'::uuid[]) into restore_ids from public.business_chart_of_accounts a
     where a.business_id=p_business_id and not a.allow_manual_posting and a.id in(select (x.value->>'account_id')::uuid from jsonb_array_elements(lines) as x(value));
   update public.business_chart_of_accounts set allow_manual_posting=true where business_id=p_business_id and id in(select (x.value->>'account_id')::uuid from jsonb_array_elements(lines) as x(value));
   insert into public.business_journal_entries(business_id,entry_date,fiscal_period_id,source_type,source_id,reference,description,status,transaction_currency,exchange_rate,reversal_of_entry_id,created_by)
   values(p_business_id,p.ends_on,p.id,'manual',p.id,'REOPEN-'||p.name,'Reverse close for '||p.name,'draft',base_currency,1,p.close_journal_entry_id,u)
   returning id into reversal_id;
   for line_item in select value from jsonb_array_elements(lines) loop
     line_no:=line_no+1;
     insert into public.business_journal_lines(business_id,journal_entry_id,line_number,account_id,description,debit_transaction,credit_transaction)
     values(p_business_id,reversal_id,line_no,(line_item->>'account_id')::uuid,line_item->>'description',(line_item->>'debit')::numeric,(line_item->>'credit')::numeric);
   end loop;
   update public.business_journal_entries set source_type='period_reopen',source_id=p.id where id=reversal_id and business_id=p_business_id;
   if cardinality(restore_ids)>0 then update public.business_chart_of_accounts set allow_manual_posting=false where business_id=p_business_id and id=any(restore_ids);end if;
   update public.business_journal_entries set status='posted' where id=reversal_id and business_id=p_business_id;
 end if;
 snap:=jsonb_build_object('period_id',p.id,'period_name',p.name,'original_close_journal_entry_id',p.close_journal_entry_id,'reversal_journal_entry_id',reversal_id,'reopened_at',now());
 update public.business_fiscal_periods set close_journal_entry_id=null,reopen_journal_entry_id=reversal_id,closing_net_income_base=null,
   closing_snapshot='{}'::jsonb,close_notes=null where id=p.id and business_id=p_business_id;
 insert into public.business_period_close_runs(business_id,fiscal_period_id,action,journal_entry_id,related_journal_entry_id,net_income_base,snapshot,notes,performed_by)
 values(p_business_id,p.id,'reopen',reversal_id,p.close_journal_entry_id,p.closing_net_income_base,snap,nullif(btrim(coalesce(p_notes,'')),''),u);
 return jsonb_build_object('period_id',p.id,'status','open','reversal_journal_entry_id',reversal_id,'snapshot',snap);
end$$;

revoke all on function private.close_business_fiscal_period_internal(uuid,uuid,text),private.lock_business_fiscal_period_internal(uuid,uuid,text),private.reopen_business_fiscal_period_internal(uuid,uuid,text) from public,anon,authenticated;

create or replace function public.close_business_fiscal_period(p_business_id uuid,p_fiscal_period_id uuid,p_notes text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$begin return private.close_business_fiscal_period_internal(p_business_id,p_fiscal_period_id,p_notes);end$$;
create or replace function public.lock_business_fiscal_period(p_business_id uuid,p_fiscal_period_id uuid,p_notes text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$begin return private.lock_business_fiscal_period_internal(p_business_id,p_fiscal_period_id,p_notes);end$$;
create or replace function public.reopen_business_fiscal_period(p_business_id uuid,p_fiscal_period_id uuid,p_notes text default null)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public,private as $$begin return private.reopen_business_fiscal_period_internal(p_business_id,p_fiscal_period_id,p_notes);end$$;

create or replace function public.get_business_tax_closing_snapshot(p_business_id uuid,p_tax_start date,p_tax_end date)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare tax_json jsonb;periods_json jsonb;runs_json jsonb;
begin
 if not private.can_view_business_tax(p_business_id) then raise exception 'Tax and closing access required.' using errcode='42501';end if;
 tax_json:=public.get_business_tax_snapshot(p_business_id,p_tax_start,p_tax_end);
 select coalesce(jsonb_agg(to_jsonb(p) order by p.starts_on desc),'[]'::jsonb) into periods_json from public.business_fiscal_periods p where p.business_id=p_business_id;
 select coalesce(jsonb_agg(to_jsonb(r) order by r.performed_at desc),'[]'::jsonb) into runs_json from public.business_period_close_runs r where r.business_id=p_business_id;
 return jsonb_build_object('tax',tax_json,'fiscal_periods',periods_json,'close_runs',runs_json,'can_manage',private.can_manage_business_tax(p_business_id));
end$$;

revoke all on function public.close_business_fiscal_period(uuid,uuid,text),public.lock_business_fiscal_period(uuid,uuid,text),public.reopen_business_fiscal_period(uuid,uuid,text),public.get_business_tax_closing_snapshot(uuid,date,date) from public,anon;
grant execute on function public.close_business_fiscal_period(uuid,uuid,text),public.lock_business_fiscal_period(uuid,uuid,text),public.reopen_business_fiscal_period(uuid,uuid,text),public.get_business_tax_closing_snapshot(uuid,date,date) to authenticated;
