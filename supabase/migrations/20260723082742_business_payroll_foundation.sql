create table public.business_payroll_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  default_pay_frequency text not null default 'monthly',
  salary_expense_account_id uuid not null,
  payroll_payable_account_id uuid not null,
  deduction_payable_account_id uuid not null,
  employer_cost_account_id uuid not null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_payroll_settings_frequency_check check (default_pay_frequency in ('monthly','biweekly','weekly')),
  constraint business_payroll_settings_salary_account_fkey foreign key (business_id,salary_expense_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  constraint business_payroll_settings_payable_account_fkey foreign key (business_id,payroll_payable_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  constraint business_payroll_settings_deduction_account_fkey foreign key (business_id,deduction_payable_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  constraint business_payroll_settings_employer_account_fkey foreign key (business_id,employer_cost_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict
);

create table public.business_employees (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_code text not null,
  display_name text not null,
  member_user_id uuid references auth.users(id) on delete set null,
  branch_id uuid,
  email text,
  phone text,
  job_title text,
  department text,
  hire_date date not null,
  termination_date date,
  status text not null default 'active',
  pay_frequency text not null default 'monthly',
  base_pay numeric(20,4) not null default 0,
  currency text not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_employees_business_id_id_key unique (business_id,id),
  constraint business_employees_code_key unique (business_id,employee_code),
  constraint business_employees_member_key unique nulls not distinct (business_id,member_user_id),
  constraint business_employees_branch_fkey foreign key (business_id,branch_id)
    references public.business_branches(business_id,id) on delete restrict,
  constraint business_employees_code_check check (employee_code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  constraint business_employees_name_check check (char_length(btrim(display_name)) between 2 and 160),
  constraint business_employees_email_check check (email is null or (char_length(email)<=320 and position('@' in email)>1)),
  constraint business_employees_phone_check check (phone is null or char_length(btrim(phone))<=40),
  constraint business_employees_job_check check (job_title is null or char_length(btrim(job_title))<=120),
  constraint business_employees_department_check check (department is null or char_length(btrim(department))<=120),
  constraint business_employees_dates_check check (termination_date is null or termination_date>=hire_date),
  constraint business_employees_status_check check (status in ('active','inactive','terminated')),
  constraint business_employees_termination_state_check check (
    (status='terminated' and termination_date is not null) or (status<>'terminated')
  ),
  constraint business_employees_frequency_check check (pay_frequency in ('monthly','biweekly','weekly')),
  constraint business_employees_base_pay_check check (base_pay>=0),
  constraint business_employees_currency_check check (public.is_supported_financial_currency(currency)),
  constraint business_employees_notes_check check (notes is null or char_length(notes)<=2000)
);

create table public.business_pay_components (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  name text not null,
  component_type text not null,
  calculation_type text not null default 'fixed',
  default_amount numeric(20,4),
  default_rate numeric(9,4),
  taxable boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_pay_components_business_id_id_key unique (business_id,id),
  constraint business_pay_components_code_key unique (business_id,code),
  constraint business_pay_components_code_check check (code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  constraint business_pay_components_name_check check (char_length(btrim(name)) between 2 and 120),
  constraint business_pay_components_type_check check (component_type in ('earning','deduction','employer_cost')),
  constraint business_pay_components_calculation_check check (calculation_type in ('fixed','percentage')),
  constraint business_pay_components_values_check check (
    (calculation_type='fixed' and default_amount is not null and default_amount>=0 and default_rate is null)
    or (calculation_type='percentage' and default_rate is not null and default_rate between 0 and 1000 and default_amount is null)
  )
);

create table public.business_employee_pay_components (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null,
  component_id uuid not null,
  amount_override numeric(20,4),
  rate_override numeric(9,4),
  active boolean not null default true,
  effective_from date not null default current_date,
  effective_to date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_employee_pay_components_employee_fkey foreign key (business_id,employee_id)
    references public.business_employees(business_id,id) on delete cascade,
  constraint business_employee_pay_components_component_fkey foreign key (business_id,component_id)
    references public.business_pay_components(business_id,id) on delete cascade,
  constraint business_employee_pay_components_key unique (business_id,employee_id,component_id,effective_from),
  constraint business_employee_pay_components_values_check check (
    (amount_override is null or amount_override>=0)
    and (rate_override is null or rate_override between 0 and 1000)
  ),
  constraint business_employee_pay_components_dates_check check (effective_to is null or effective_to>=effective_from)
);

create table public.business_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  run_no bigint generated always as identity unique,
  business_id uuid not null references public.businesses(id) on delete cascade,
  branch_id uuid,
  name text not null,
  pay_frequency text not null,
  period_start date not null,
  period_end date not null,
  pay_date date not null,
  currency text not null,
  status text not null default 'draft',
  approval_request_id uuid,
  payroll_journal_entry_id uuid,
  payment_journal_entry_id uuid,
  gross_total numeric(24,4) not null default 0,
  deduction_total numeric(24,4) not null default 0,
  net_total numeric(24,4) not null default 0,
  employer_cost_total numeric(24,4) not null default 0,
  employee_count integer not null default 0,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  submitted_by uuid references auth.users(id) on delete set null,
  submitted_at timestamptz,
  approved_at timestamptz,
  posted_by uuid references auth.users(id) on delete set null,
  posted_at timestamptz,
  paid_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_payroll_runs_business_id_id_key unique (business_id,id),
  constraint business_payroll_runs_branch_fkey foreign key (business_id,branch_id)
    references public.business_branches(business_id,id) on delete restrict,
  constraint business_payroll_runs_approval_fkey foreign key (business_id,approval_request_id)
    references public.business_approval_requests(business_id,id) on delete restrict,
  constraint business_payroll_runs_payroll_journal_fkey foreign key (business_id,payroll_journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  constraint business_payroll_runs_payment_journal_fkey foreign key (business_id,payment_journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  constraint business_payroll_runs_name_check check (char_length(btrim(name)) between 2 and 160),
  constraint business_payroll_runs_frequency_check check (pay_frequency in ('monthly','biweekly','weekly')),
  constraint business_payroll_runs_dates_check check (period_start<=period_end and pay_date>=period_start),
  constraint business_payroll_runs_currency_check check (public.is_supported_financial_currency(currency)),
  constraint business_payroll_runs_status_check check (status in ('draft','pending_approval','approved','rejected','posted','paid','cancelled')),
  constraint business_payroll_runs_totals_check check (
    gross_total>=0 and deduction_total>=0 and net_total>=0 and employer_cost_total>=0
    and employee_count>=0 and net_total=gross_total-deduction_total
  ),
  constraint business_payroll_runs_notes_check check (notes is null or char_length(notes)<=2000),
  constraint business_payroll_runs_state_check check (
    (status='draft' and approval_request_id is null and submitted_at is null and approved_at is null and payroll_journal_entry_id is null and payment_journal_entry_id is null)
    or (status='pending_approval' and approval_request_id is not null and submitted_at is not null and approved_at is null and payroll_journal_entry_id is null and payment_journal_entry_id is null)
    or (status='approved' and approval_request_id is not null and submitted_at is not null and approved_at is not null and payroll_journal_entry_id is null and payment_journal_entry_id is null)
    or (status='rejected' and approval_request_id is not null and submitted_at is not null and payroll_journal_entry_id is null and payment_journal_entry_id is null)
    or (status='posted' and approval_request_id is not null and approved_at is not null and payroll_journal_entry_id is not null and payment_journal_entry_id is null and posted_at is not null)
    or (status='paid' and approval_request_id is not null and approved_at is not null and payroll_journal_entry_id is not null and payment_journal_entry_id is not null and posted_at is not null and paid_at is not null)
    or (status='cancelled' and cancelled_at is not null and payroll_journal_entry_id is null and payment_journal_entry_id is null)
  )
);

create unique index business_payroll_runs_open_period_idx
  on public.business_payroll_runs(business_id,coalesce(branch_id,'00000000-0000-0000-0000-000000000000'::uuid),pay_frequency,period_start,period_end)
  where status in ('draft','pending_approval','approved','posted');

create table public.business_payroll_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payroll_run_id uuid not null,
  employee_id uuid not null,
  employee_code text not null,
  employee_name text not null,
  branch_id uuid,
  base_pay numeric(20,4) not null,
  earnings_total numeric(20,4) not null default 0,
  gross_pay numeric(20,4) not null,
  deduction_total numeric(20,4) not null default 0,
  net_pay numeric(20,4) not null,
  employer_cost_total numeric(20,4) not null default 0,
  created_at timestamptz not null default now(),
  constraint business_payroll_items_business_id_id_key unique (business_id,id),
  constraint business_payroll_items_run_fkey foreign key (business_id,payroll_run_id)
    references public.business_payroll_runs(business_id,id) on delete cascade,
  constraint business_payroll_items_employee_fkey foreign key (business_id,employee_id)
    references public.business_employees(business_id,id) on delete restrict,
  constraint business_payroll_items_branch_fkey foreign key (business_id,branch_id)
    references public.business_branches(business_id,id) on delete restrict,
  constraint business_payroll_items_key unique (business_id,payroll_run_id,employee_id),
  constraint business_payroll_items_name_check check (char_length(btrim(employee_name)) between 2 and 160),
  constraint business_payroll_items_totals_check check (
    base_pay>=0 and earnings_total>=0 and gross_pay=base_pay+earnings_total
    and deduction_total>=0 and deduction_total<=gross_pay and net_pay=gross_pay-deduction_total
    and employer_cost_total>=0
  )
);

create table public.business_payroll_item_lines (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payroll_item_id uuid not null,
  component_id uuid,
  component_code text not null,
  component_name text not null,
  component_type text not null,
  calculation_type text not null,
  basis_amount numeric(20,4) not null default 0,
  rate numeric(9,4),
  amount numeric(20,4) not null,
  created_at timestamptz not null default now(),
  constraint business_payroll_item_lines_item_fkey foreign key (business_id,payroll_item_id)
    references public.business_payroll_items(business_id,id) on delete cascade,
  constraint business_payroll_item_lines_component_fkey foreign key (business_id,component_id)
    references public.business_pay_components(business_id,id) on delete restrict,
  constraint business_payroll_item_lines_code_check check (component_code ~ '^[A-Z0-9][A-Z0-9_-]{1,39}$'),
  constraint business_payroll_item_lines_name_check check (char_length(btrim(component_name)) between 2 and 120),
  constraint business_payroll_item_lines_type_check check (component_type in ('base','earning','deduction','employer_cost')),
  constraint business_payroll_item_lines_calculation_check check (calculation_type in ('fixed','percentage')),
  constraint business_payroll_item_lines_values_check check (
    basis_amount>=0 and amount>=0 and (rate is null or rate between 0 and 1000)
  )
);

create table public.business_payroll_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payroll_run_id uuid not null,
  payment_account_id uuid not null,
  journal_entry_id uuid not null,
  payment_date date not null,
  amount numeric(24,4) not null,
  reference text,
  paid_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_payroll_payments_run_fkey foreign key (business_id,payroll_run_id)
    references public.business_payroll_runs(business_id,id) on delete restrict,
  constraint business_payroll_payments_account_fkey foreign key (business_id,payment_account_id)
    references public.business_chart_of_accounts(business_id,id) on delete restrict,
  constraint business_payroll_payments_journal_fkey foreign key (business_id,journal_entry_id)
    references public.business_journal_entries(business_id,id) on delete restrict,
  constraint business_payroll_payments_run_key unique (business_id,payroll_run_id),
  constraint business_payroll_payments_amount_check check (amount>0),
  constraint business_payroll_payments_reference_check check (reference is null or char_length(btrim(reference))<=160)
);

create table public.business_payroll_audit_log (
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid,
  payroll_run_id uuid,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint business_payroll_audit_employee_fkey foreign key (business_id,employee_id)
    references public.business_employees(business_id,id) on delete cascade,
  constraint business_payroll_audit_run_fkey foreign key (business_id,payroll_run_id)
    references public.business_payroll_runs(business_id,id) on delete cascade,
  constraint business_payroll_audit_action_check check (action ~ '^[a-z][a-z0-9_]{2,79}$')
);

create index business_payroll_settings_salary_idx on public.business_payroll_settings(business_id,salary_expense_account_id);
create index business_payroll_settings_payable_idx on public.business_payroll_settings(business_id,payroll_payable_account_id);
create index business_payroll_settings_deduction_idx on public.business_payroll_settings(business_id,deduction_payable_account_id);
create index business_payroll_settings_employer_idx on public.business_payroll_settings(business_id,employer_cost_account_id);
create index business_employees_branch_status_idx on public.business_employees(business_id,branch_id,status,display_name);
create index business_employees_member_idx on public.business_employees(member_user_id) where member_user_id is not null;
create index business_employees_created_by_idx on public.business_employees(created_by);
create index business_employees_updated_by_idx on public.business_employees(updated_by);
create index business_pay_components_business_active_idx on public.business_pay_components(business_id,active,component_type,name);
create index business_pay_components_created_by_idx on public.business_pay_components(created_by);
create index business_pay_components_updated_by_idx on public.business_pay_components(updated_by);
create index business_employee_components_employee_idx on public.business_employee_pay_components(business_id,employee_id,active,effective_from,effective_to);
create index business_employee_components_component_idx on public.business_employee_pay_components(business_id,component_id);
create index business_employee_components_created_by_idx on public.business_employee_pay_components(created_by);
create index business_employee_components_updated_by_idx on public.business_employee_pay_components(updated_by);
create index business_payroll_runs_queue_idx on public.business_payroll_runs(business_id,status,pay_date desc);
create index business_payroll_runs_branch_idx on public.business_payroll_runs(business_id,branch_id);
create index business_payroll_runs_approval_idx on public.business_payroll_runs(business_id,approval_request_id);
create index business_payroll_runs_payroll_journal_idx on public.business_payroll_runs(business_id,payroll_journal_entry_id);
create index business_payroll_runs_payment_journal_idx on public.business_payroll_runs(business_id,payment_journal_entry_id);
create index business_payroll_runs_created_by_idx on public.business_payroll_runs(created_by);
create index business_payroll_runs_submitted_by_idx on public.business_payroll_runs(submitted_by);
create index business_payroll_runs_posted_by_idx on public.business_payroll_runs(posted_by);
create index business_payroll_runs_paid_by_idx on public.business_payroll_runs(paid_by);
create index business_payroll_runs_cancelled_by_idx on public.business_payroll_runs(cancelled_by);
create index business_payroll_items_run_idx on public.business_payroll_items(business_id,payroll_run_id);
create index business_payroll_items_employee_idx on public.business_payroll_items(business_id,employee_id);
create index business_payroll_items_branch_idx on public.business_payroll_items(business_id,branch_id);
create index business_payroll_item_lines_item_idx on public.business_payroll_item_lines(business_id,payroll_item_id);
create index business_payroll_item_lines_component_idx on public.business_payroll_item_lines(business_id,component_id);
create index business_payroll_payments_run_idx on public.business_payroll_payments(business_id,payroll_run_id);
create index business_payroll_payments_account_idx on public.business_payroll_payments(business_id,payment_account_id);
create index business_payroll_payments_journal_idx on public.business_payroll_payments(business_id,journal_entry_id);
create index business_payroll_payments_paid_by_idx on public.business_payroll_payments(paid_by);
create index business_payroll_audit_business_idx on public.business_payroll_audit_log(business_id,created_at desc);
create index business_payroll_audit_employee_idx on public.business_payroll_audit_log(business_id,employee_id);
create index business_payroll_audit_run_idx on public.business_payroll_audit_log(business_id,payroll_run_id);
create index business_payroll_audit_actor_idx on public.business_payroll_audit_log(actor_user_id);

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
  'branches.view','branches.manage','approvals.view','approvals.request','approvals.decide','approvals.manage',
  'payroll.view','payroll.manage','payroll.process','payroll.pay',
  'contacts.view','contacts.manage',
  'sales.view','sales.manage','sales.collect','sales.return',
  'purchases.view','purchases.manage','purchases.pay','purchases.return',
  'inventory.view','inventory.manage','inventory.transfer','inventory.adjust',
  'crm.view','crm.manage','reports.view','shop.view','shop.sell','shop.purchase','shop.expense'
]::text[];
$$;

create or replace function private.can_view_business_payroll(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
select (select auth.uid()) is not null and exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=(select auth.uid())
    and membership.status='active' and business.status='active'
    and (membership.role in ('owner','admin','accountant','manager') or '*'=any(membership.permissions)
      or 'payroll.view'=any(membership.permissions) or 'payroll.manage'=any(membership.permissions)
      or 'payroll.process'=any(membership.permissions) or 'payroll.pay'=any(membership.permissions))
);$$;

create or replace function private.can_manage_business_payroll(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
select (select auth.uid()) is not null and exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=(select auth.uid())
    and membership.status='active' and business.status='active'
    and (membership.role in ('owner','admin') or '*'=any(membership.permissions) or 'payroll.manage'=any(membership.permissions))
);$$;

create or replace function private.can_process_business_payroll(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
select (select auth.uid()) is not null and exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=(select auth.uid())
    and membership.status='active' and business.status='active'
    and (membership.role in ('owner','admin','accountant','manager') or '*'=any(membership.permissions)
      or 'payroll.process'=any(membership.permissions) or 'payroll.manage'=any(membership.permissions))
);$$;

create or replace function private.can_pay_business_payroll(p_business_id uuid)
returns boolean language sql stable security definer set search_path=pg_catalog,public
as $$
select (select auth.uid()) is not null and exists(
  select 1 from public.business_members membership
  join public.businesses business on business.id=membership.business_id
  where membership.business_id=p_business_id and membership.user_id=(select auth.uid())
    and membership.status='active' and business.status='active'
    and (membership.role in ('owner','admin','accountant') or '*'=any(membership.permissions)
      or 'payroll.pay'=any(membership.permissions) or 'payroll.manage'=any(membership.permissions))
);$$;

create or replace function private.guard_business_payroll_write()
returns trigger language plpgsql set search_path=pg_catalog
as $$
declare expected_action text;
begin
  expected_action:=case tg_table_name
    when 'business_payroll_settings' then 'settings_write'
    when 'business_employees' then 'employee_write'
    when 'business_pay_components' then 'component_write'
    when 'business_employee_pay_components' then 'assignment_write'
    when 'business_payroll_runs' then 'run_write'
    when 'business_payroll_items' then 'item_write'
    when 'business_payroll_item_lines' then 'line_write'
    when 'business_payroll_payments' then 'payment_write'
    when 'business_payroll_audit_log' then 'audit_write'
    else 'blocked' end;
  if coalesce(current_setting('app.business_payroll_action',true),'')<>expected_action then
    raise exception 'Direct payroll writes are not allowed.' using errcode='42501';
  end if;
  if tg_op='DELETE' then return old;end if;
  return new;
end;$$;

create trigger business_payroll_settings_guard before insert or update or delete on public.business_payroll_settings for each row execute function private.guard_business_payroll_write();
create trigger business_employees_guard before insert or update or delete on public.business_employees for each row execute function private.guard_business_payroll_write();
create trigger business_pay_components_guard before insert or update or delete on public.business_pay_components for each row execute function private.guard_business_payroll_write();
create trigger business_employee_pay_components_guard before insert or update or delete on public.business_employee_pay_components for each row execute function private.guard_business_payroll_write();
create trigger business_payroll_runs_guard before insert or update or delete on public.business_payroll_runs for each row execute function private.guard_business_payroll_write();
create trigger business_payroll_items_guard before insert or update or delete on public.business_payroll_items for each row execute function private.guard_business_payroll_write();
create trigger business_payroll_item_lines_guard before insert or update or delete on public.business_payroll_item_lines for each row execute function private.guard_business_payroll_write();
create trigger business_payroll_payments_guard before insert or update or delete on public.business_payroll_payments for each row execute function private.guard_business_payroll_write();
create trigger business_payroll_audit_guard before insert or update or delete on public.business_payroll_audit_log for each row execute function private.guard_business_payroll_write();

create trigger business_payroll_settings_updated_at before update on public.business_payroll_settings for each row execute function private.set_business_workspace_updated_at();
create trigger business_employees_updated_at before update on public.business_employees for each row execute function private.set_business_workspace_updated_at();
create trigger business_pay_components_updated_at before update on public.business_pay_components for each row execute function private.set_business_workspace_updated_at();
create trigger business_employee_pay_components_updated_at before update on public.business_employee_pay_components for each row execute function private.set_business_workspace_updated_at();
create trigger business_payroll_runs_updated_at before update on public.business_payroll_runs for each row execute function private.set_business_workspace_updated_at();

create or replace function private.ensure_business_payroll_foundation(p_business_id uuid,p_actor_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public
as $$
declare salary_id uuid;payable_id uuid;deduction_id uuid;employer_id uuid;base_currency text;
begin
  select base_currency into base_currency from public.businesses where id=p_business_id and status='active';
  if base_currency is null then raise exception 'Active business not found.' using errcode='P0002';end if;
  select id into salary_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='salaries_wages';
  if salary_id is null then
    insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
    values(p_business_id,'6100','Salaries and wages','expense','payroll','debit','salaries_wages',true,p_actor_id)
    on conflict(business_id,code) do update set system_key='salaries_wages',updated_at=now()
    returning id into salary_id;
  end if;
  insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
  values(p_business_id,'2210','Payroll payable','liability','payroll','credit','payroll_payable',false,p_actor_id)
  on conflict(business_id,code) do update set name=excluded.name,account_type=excluded.account_type,account_subtype=excluded.account_subtype,normal_balance=excluded.normal_balance,system_key=excluded.system_key,allow_manual_posting=excluded.allow_manual_posting,updated_at=now();
  select id into payable_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='payroll_payable';
  insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
  values(p_business_id,'2220','Payroll deductions payable','liability','payroll_deduction','credit','payroll_deductions_payable',false,p_actor_id)
  on conflict(business_id,code) do update set name=excluded.name,account_type=excluded.account_type,account_subtype=excluded.account_subtype,normal_balance=excluded.normal_balance,system_key=excluded.system_key,allow_manual_posting=excluded.allow_manual_posting,updated_at=now();
  select id into deduction_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='payroll_deductions_payable';
  insert into public.business_chart_of_accounts(business_id,code,name,account_type,account_subtype,normal_balance,system_key,allow_manual_posting,created_by)
  values(p_business_id,'6110','Employer payroll costs','expense','payroll','debit','employer_payroll_cost',true,p_actor_id)
  on conflict(business_id,code) do update set name=excluded.name,account_type=excluded.account_type,account_subtype=excluded.account_subtype,normal_balance=excluded.normal_balance,system_key=excluded.system_key,allow_manual_posting=excluded.allow_manual_posting,updated_at=now();
  select id into employer_id from public.business_chart_of_accounts where business_id=p_business_id and system_key='employer_payroll_cost';
  if salary_id is null or payable_id is null or deduction_id is null or employer_id is null then
    raise exception 'Payroll accounting foundation could not be initialized.' using errcode='23503';
  end if;
  perform set_config('app.business_payroll_action','settings_write',true);
  insert into public.business_payroll_settings(
    business_id,salary_expense_account_id,payroll_payable_account_id,deduction_payable_account_id,employer_cost_account_id,updated_by
  ) values(p_business_id,salary_id,payable_id,deduction_id,employer_id,p_actor_id)
  on conflict(business_id) do update set
    salary_expense_account_id=excluded.salary_expense_account_id,
    payroll_payable_account_id=excluded.payroll_payable_account_id,
    deduction_payable_account_id=excluded.deduction_payable_account_id,
    employer_cost_account_id=excluded.employer_cost_account_id,
    updated_by=excluded.updated_by;
end;$$;

create or replace function private.initialize_business_payroll_on_owner()
returns trigger language plpgsql security definer set search_path=pg_catalog,public,private
as $$begin
  if new.role='owner' and new.status='active' then perform private.ensure_business_payroll_foundation(new.business_id,new.user_id);end if;
  return new;
end;$$;
create trigger business_members_initialize_payroll
after insert or update of role,status on public.business_members
for each row execute function private.initialize_business_payroll_on_owner();

do $$declare rec record;begin
  for rec in select id,owner_user_id from public.businesses where status='active' loop
    perform private.ensure_business_payroll_foundation(rec.id,rec.owner_user_id);
  end loop;
end$$;

alter table public.business_payroll_settings enable row level security;
alter table public.business_employees enable row level security;
alter table public.business_pay_components enable row level security;
alter table public.business_employee_pay_components enable row level security;
alter table public.business_payroll_runs enable row level security;
alter table public.business_payroll_items enable row level security;
alter table public.business_payroll_item_lines enable row level security;
alter table public.business_payroll_payments enable row level security;
alter table public.business_payroll_audit_log enable row level security;

create policy business_payroll_settings_select on public.business_payroll_settings for select to authenticated using(private.can_view_business_payroll(business_id));
create policy business_employees_select on public.business_employees for select to authenticated using(private.can_view_business_payroll(business_id) and (branch_id is null or private.has_business_branch_access(business_id,branch_id,(select auth.uid()))));
create policy business_pay_components_select on public.business_pay_components for select to authenticated using(private.can_view_business_payroll(business_id));
create policy business_employee_pay_components_select on public.business_employee_pay_components for select to authenticated using(private.can_view_business_payroll(business_id) and exists(select 1 from public.business_employees e where e.business_id=business_employee_pay_components.business_id and e.id=business_employee_pay_components.employee_id and (e.branch_id is null or private.has_business_branch_access(e.business_id,e.branch_id,(select auth.uid())))));
create policy business_payroll_runs_select on public.business_payroll_runs for select to authenticated using(private.can_view_business_payroll(business_id) and (branch_id is null or private.has_business_branch_access(business_id,branch_id,(select auth.uid()))));
create policy business_payroll_items_select on public.business_payroll_items for select to authenticated using(private.can_view_business_payroll(business_id) and exists(select 1 from public.business_payroll_runs r where r.business_id=business_payroll_items.business_id and r.id=business_payroll_items.payroll_run_id and (r.branch_id is null or private.has_business_branch_access(r.business_id,r.branch_id,(select auth.uid())))));
create policy business_payroll_item_lines_select on public.business_payroll_item_lines for select to authenticated using(private.can_view_business_payroll(business_id) and exists(select 1 from public.business_payroll_items i join public.business_payroll_runs r on r.business_id=i.business_id and r.id=i.payroll_run_id where i.business_id=business_payroll_item_lines.business_id and i.id=business_payroll_item_lines.payroll_item_id and (r.branch_id is null or private.has_business_branch_access(r.business_id,r.branch_id,(select auth.uid())))));
create policy business_payroll_payments_select on public.business_payroll_payments for select to authenticated using(private.can_view_business_payroll(business_id) and exists(select 1 from public.business_payroll_runs r where r.business_id=business_payroll_payments.business_id and r.id=business_payroll_payments.payroll_run_id and (r.branch_id is null or private.has_business_branch_access(r.business_id,r.branch_id,(select auth.uid())))));
create policy business_payroll_audit_select on public.business_payroll_audit_log for select to authenticated using(private.can_view_business_payroll(business_id));

revoke all on public.business_payroll_settings,public.business_employees,public.business_pay_components,public.business_employee_pay_components,public.business_payroll_runs,public.business_payroll_items,public.business_payroll_item_lines,public.business_payroll_payments,public.business_payroll_audit_log from anon,authenticated;
grant select on public.business_payroll_settings,public.business_employees,public.business_pay_components,public.business_employee_pay_components,public.business_payroll_runs,public.business_payroll_items,public.business_payroll_item_lines,public.business_payroll_payments,public.business_payroll_audit_log to authenticated;

revoke execute on function private.can_view_business_payroll(uuid),private.can_manage_business_payroll(uuid),private.can_process_business_payroll(uuid),private.can_pay_business_payroll(uuid) from public,anon;
grant execute on function private.can_view_business_payroll(uuid),private.can_manage_business_payroll(uuid),private.can_process_business_payroll(uuid),private.can_pay_business_payroll(uuid) to authenticated;
