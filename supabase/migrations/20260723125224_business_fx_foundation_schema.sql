-- Business multi-currency and FX foundation.

alter table public.business_chart_of_accounts
  drop constraint if exists business_chart_accounts_type_normal_check;
alter table public.business_chart_of_accounts
  add constraint business_chart_accounts_type_normal_check check (
    ((account_type in ('asset','expense')) and normal_balance='debit')
    or ((account_type in ('liability','revenue')) and normal_balance='credit')
    or (account_type='asset' and account_subtype='contra_asset' and normal_balance='credit')
    or (account_type='equity' and (
      (account_subtype='drawings' and normal_balance='debit')
      or (coalesce(account_subtype,'')<>'drawings' and normal_balance='credit')
    ))
  );

create table if not exists public.business_fx_settings(
  business_id uuid primary key references public.businesses(id) on delete cascade,
  realized_gain_account_id uuid not null,
  realized_loss_account_id uuid not null,
  unrealized_gain_account_id uuid not null,
  unrealized_loss_account_id uuid not null,
  next_revaluation_number bigint not null default 1 check(next_revaluation_number>0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,realized_gain_account_id),
  unique(business_id,realized_loss_account_id),
  unique(business_id,unrealized_gain_account_id),
  unique(business_id,unrealized_loss_account_id),
  foreign key(business_id,realized_gain_account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key(business_id,realized_loss_account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key(business_id,unrealized_gain_account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict,
  foreign key(business_id,unrealized_loss_account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict
);

create table if not exists public.business_fx_rates(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  currency text not null check(public.is_supported_financial_currency(currency)),
  rate_date date not null,
  rate_to_base numeric(24,10) not null check(rate_to_base>0),
  source text not null default 'manual' check(source in ('manual','import','api')),
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,currency,rate_date),
  unique(business_id,id),
  check(char_length(currency)=3),
  check(notes is null or char_length(btrim(notes))<=500)
);

create table if not exists public.business_fx_revaluation_runs(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  run_number bigint not null,
  run_code text not null,
  closing_date date not null,
  status text not null default 'draft' check(status in ('draft','posted','reversed','cancelled')),
  exposure_count integer not null default 0 check(exposure_count>=0),
  total_gain_base numeric(24,6) not null default 0 check(total_gain_base>=0),
  total_loss_base numeric(24,6) not null default 0 check(total_loss_base>=0),
  journal_entry_id uuid,
  reversal_journal_entry_id uuid,
  reversal_date date,
  notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  posted_by uuid references auth.users(id) on delete restrict,
  posted_at timestamptz,
  reversed_by uuid references auth.users(id) on delete restrict,
  reversed_at timestamptz,
  cancelled_by uuid references auth.users(id) on delete restrict,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(business_id,run_number),
  unique(business_id,run_code),
  unique(business_id,closing_date),
  unique(business_id,id),
  foreign key(business_id,journal_entry_id) references public.business_journal_entries(business_id,id) on delete restrict,
  foreign key(business_id,reversal_journal_entry_id) references public.business_journal_entries(business_id,id) on delete restrict,
  check(char_length(run_code) between 3 and 40),
  check(notes is null or char_length(btrim(notes))<=500),
  check(
    (status='draft' and journal_entry_id is null and reversal_journal_entry_id is null and posted_at is null and reversed_at is null and cancelled_at is null)
    or (status='posted' and journal_entry_id is not null and posted_at is not null and reversal_journal_entry_id is null and reversed_at is null and cancelled_at is null)
    or (status='reversed' and journal_entry_id is not null and posted_at is not null and reversal_journal_entry_id is not null and reversal_date is not null and reversed_at is not null and cancelled_at is null)
    or (status='cancelled' and journal_entry_id is null and reversal_journal_entry_id is null and cancelled_at is not null)
  )
);

create unique index if not exists business_fx_single_active_revaluation_idx
  on public.business_fx_revaluation_runs(business_id)
  where status='posted';

create table if not exists public.business_fx_revaluation_lines(
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  revaluation_run_id uuid not null,
  exposure_type text not null check(exposure_type in ('sales_receivable','supplier_payable','bank_balance')),
  exposure_id uuid not null,
  exposure_code text not null,
  account_id uuid not null,
  currency text not null check(public.is_supported_financial_currency(currency)),
  transaction_balance numeric(24,6) not null check(transaction_balance>0),
  carrying_base numeric(24,6) not null check(carrying_base>=0),
  closing_rate numeric(24,10) not null check(closing_rate>0),
  revalued_base numeric(24,6) not null check(revalued_base>=0),
  adjustment_base numeric(24,6) not null,
  created_at timestamptz not null default now(),
  unique(business_id,revaluation_run_id,exposure_type,exposure_id),
  unique(business_id,id),
  foreign key(business_id,revaluation_run_id) references public.business_fx_revaluation_runs(business_id,id) on delete cascade,
  foreign key(business_id,account_id) references public.business_chart_of_accounts(business_id,id) on delete restrict,
  check(char_length(btrim(exposure_code)) between 1 and 100)
);

create table if not exists public.business_fx_audit_log(
  id bigint generated always as identity primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  rate_id uuid,
  revaluation_run_id uuid,
  action text not null,
  actor_id uuid not null references auth.users(id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key(business_id,rate_id) references public.business_fx_rates(business_id,id) on delete set null,
  foreign key(business_id,revaluation_run_id) references public.business_fx_revaluation_runs(business_id,id) on delete set null,
  check(char_length(btrim(action)) between 2 and 80)
);

alter table public.business_sales_payments
  add column if not exists settlement_rate_id uuid,
  add column if not exists settlement_exchange_rate numeric(24,10),
  add column if not exists carrying_amount_base numeric(24,6),
  add column if not exists realized_fx_gain_base numeric(24,6) not null default 0,
  add column if not exists realized_fx_loss_base numeric(24,6) not null default 0;

alter table public.business_supplier_payments
  add column if not exists settlement_rate_id uuid,
  add column if not exists settlement_exchange_rate numeric(24,10),
  add column if not exists carrying_amount_base numeric(24,6),
  add column if not exists realized_fx_gain_base numeric(24,6) not null default 0,
  add column if not exists realized_fx_loss_base numeric(24,6) not null default 0;

update public.business_sales_payments
set settlement_exchange_rate=case when amount_transaction>0 then amount_base/amount_transaction else 1 end,
    carrying_amount_base=amount_base
where settlement_exchange_rate is null or carrying_amount_base is null;
update public.business_supplier_payments
set settlement_exchange_rate=case when amount_transaction>0 then amount_base/amount_transaction else 1 end,
    carrying_amount_base=amount_base
where settlement_exchange_rate is null or carrying_amount_base is null;

alter table public.business_sales_payments
  alter column settlement_exchange_rate set not null,
  alter column carrying_amount_base set not null,
  add constraint business_sales_payments_settlement_rate_check check(settlement_exchange_rate>0),
  add constraint business_sales_payments_carrying_check check(carrying_amount_base>0),
  add constraint business_sales_payments_fx_side_check check(realized_fx_gain_base>=0 and realized_fx_loss_base>=0 and not(realized_fx_gain_base>0 and realized_fx_loss_base>0));
alter table public.business_supplier_payments
  alter column settlement_exchange_rate set not null,
  alter column carrying_amount_base set not null,
  add constraint business_supplier_payments_settlement_rate_check check(settlement_exchange_rate>0),
  add constraint business_supplier_payments_carrying_check check(carrying_amount_base>0),
  add constraint business_supplier_payments_fx_side_check check(realized_fx_gain_base>=0 and realized_fx_loss_base>=0 and not(realized_fx_gain_base>0 and realized_fx_loss_base>0));

alter table public.business_sales_payments
  add constraint business_sales_payments_rate_fkey foreign key(business_id,settlement_rate_id) references public.business_fx_rates(business_id,id) on delete restrict;
alter table public.business_supplier_payments
  add constraint business_supplier_payments_rate_fkey foreign key(business_id,settlement_rate_id) references public.business_fx_rates(business_id,id) on delete restrict;

create index if not exists business_fx_rates_lookup_idx on public.business_fx_rates(business_id,currency,rate_date desc);
create index if not exists business_fx_rates_created_by_idx on public.business_fx_rates(created_by);
create index if not exists business_fx_runs_business_date_idx on public.business_fx_revaluation_runs(business_id,closing_date desc,status);
create index if not exists business_fx_runs_journal_idx on public.business_fx_revaluation_runs(business_id,journal_entry_id);
create index if not exists business_fx_runs_reversal_idx on public.business_fx_revaluation_runs(business_id,reversal_journal_entry_id);
create index if not exists business_fx_lines_run_idx on public.business_fx_revaluation_lines(business_id,revaluation_run_id);
create index if not exists business_fx_lines_exposure_idx on public.business_fx_revaluation_lines(business_id,exposure_type,exposure_id);
create index if not exists business_fx_lines_account_idx on public.business_fx_revaluation_lines(business_id,account_id);
create index if not exists business_fx_audit_business_idx on public.business_fx_audit_log(business_id,created_at desc);
create index if not exists business_fx_audit_rate_idx on public.business_fx_audit_log(business_id,rate_id);
create index if not exists business_fx_audit_run_idx on public.business_fx_audit_log(business_id,revaluation_run_id);
create index if not exists business_fx_audit_actor_idx on public.business_fx_audit_log(actor_id);
create index if not exists business_sales_payments_rate_idx on public.business_sales_payments(business_id,settlement_rate_id);
create index if not exists business_supplier_payments_rate_idx on public.business_supplier_payments(business_id,settlement_rate_id);

alter table public.business_fx_settings enable row level security;
alter table public.business_fx_rates enable row level security;
alter table public.business_fx_revaluation_runs enable row level security;
alter table public.business_fx_revaluation_lines enable row level security;
alter table public.business_fx_audit_log enable row level security;

revoke all on public.business_fx_settings,public.business_fx_rates,public.business_fx_revaluation_runs,public.business_fx_revaluation_lines,public.business_fx_audit_log from anon,authenticated;
grant select on public.business_fx_settings,public.business_fx_rates,public.business_fx_revaluation_runs,public.business_fx_revaluation_lines,public.business_fx_audit_log to authenticated;
