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
 select b.base_currency into base_currency from public.businesses b where b.id=p_business_id and b.status='active';
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
grant execute on function private.reopen_business_fiscal_period_internal(uuid,uuid,text) to authenticated;
