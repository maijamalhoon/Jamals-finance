alter table public.accounts
  drop constraint if exists accounts_type_check;

alter table public.accounts
  add constraint accounts_type_check
  check (
    type = any (
      array[
        'bank',
        'cash',
        'jazzcash',
        'easypaisa',
        'sadapay',
        'nayapay',
        'wallet',
        'freelance',
        'investment',
        'other'
      ]::text[]
    )
  );

alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;

create index if not exists categories_user_type_parent_idx
  on public.categories(user_id, type, parent_id, name);

alter table public.transactions
  add column if not exists source_name text,
  add column if not exists person_name text,
  add column if not exists item_name text;

create index if not exists transactions_user_type_date_idx
  on public.transactions(user_id, type, date desc);

create index if not exists transactions_user_source_idx
  on public.transactions(user_id, lower(source_name))
  where source_name is not null;

create index if not exists transactions_user_person_idx
  on public.transactions(user_id, lower(person_name))
  where person_name is not null;

create index if not exists transactions_user_item_idx
  on public.transactions(user_id, lower(item_name))
  where item_name is not null;

create table if not exists public.liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_name text not null,
  item_name text,
  reason text not null,
  original_value numeric not null default 0 check (original_value >= 0),
  paid_amount numeric not null default 0 check (paid_amount >= 0),
  remaining_amount numeric generated always as (
    greatest(original_value - paid_amount, 0)
  ) stored,
  due_date date,
  status text not null default 'pending'
    check (status = any (array['pending', 'partial', 'completed', 'overdue']::text[])),
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  completed_at timestamp with time zone,
  unique (id, user_id)
);

create table if not exists public.liability_payments (
  id uuid primary key default gen_random_uuid(),
  liability_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount numeric not null check (amount > 0),
  paid_at date not null default current_date,
  note text,
  created_at timestamp with time zone default now(),
  constraint liability_payments_liability_owner_fkey
    foreign key (liability_id, user_id)
    references public.liabilities(id, user_id)
    on delete cascade
);

create index if not exists liabilities_user_status_due_idx
  on public.liabilities(user_id, status, due_date);

create index if not exists liabilities_user_person_idx
  on public.liabilities(user_id, lower(person_name));

create index if not exists liabilities_user_item_idx
  on public.liabilities(user_id, lower(item_name))
  where item_name is not null;

create index if not exists liability_payments_user_liability_date_idx
  on public.liability_payments(user_id, liability_id, paid_at desc);

alter table public.liabilities enable row level security;
alter table public.liability_payments enable row level security;

drop policy if exists liabilities_owner_select on public.liabilities;
drop policy if exists liabilities_owner_insert on public.liabilities;
drop policy if exists liabilities_owner_update on public.liabilities;
drop policy if exists liabilities_owner_delete on public.liabilities;

create policy liabilities_owner_select
  on public.liabilities for select
  to authenticated
  using (auth.uid() = user_id);

create policy liabilities_owner_insert
  on public.liabilities for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy liabilities_owner_update
  on public.liabilities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy liabilities_owner_delete
  on public.liabilities for delete
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists liability_payments_owner_select on public.liability_payments;
drop policy if exists liability_payments_owner_insert on public.liability_payments;
drop policy if exists liability_payments_owner_update on public.liability_payments;
drop policy if exists liability_payments_owner_delete on public.liability_payments;

create policy liability_payments_owner_select
  on public.liability_payments for select
  to authenticated
  using (auth.uid() = user_id);

create policy liability_payments_owner_insert
  on public.liability_payments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.liabilities l
      where l.id = liability_id
        and l.user_id = auth.uid()
    )
  );

create policy liability_payments_owner_update
  on public.liability_payments for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.liabilities l
      where l.id = liability_id
        and l.user_id = auth.uid()
    )
  );

create policy liability_payments_owner_delete
  on public.liability_payments for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.liabilities to authenticated;
grant select, insert, update, delete on public.liability_payments to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_liabilities_updated_at on public.liabilities;

create trigger touch_liabilities_updated_at
before update on public.liabilities
for each row
execute function public.touch_updated_at();

create or replace function public.sync_liability_payment_totals()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  target_liability_id uuid;
  target_user_id uuid;
begin
  target_liability_id = coalesce(new.liability_id, old.liability_id);
  target_user_id = coalesce(new.user_id, old.user_id);

  update public.liabilities l
  set
    paid_amount = coalesce((
      select sum(p.amount)
      from public.liability_payments p
      where p.liability_id = target_liability_id
        and p.user_id = target_user_id
    ), 0),
    status = case
      when coalesce((
        select sum(p.amount)
        from public.liability_payments p
        where p.liability_id = target_liability_id
          and p.user_id = target_user_id
      ), 0) >= l.original_value then 'completed'
      when l.due_date is not null
        and l.due_date < current_date
        and coalesce((
          select sum(p.amount)
          from public.liability_payments p
          where p.liability_id = target_liability_id
            and p.user_id = target_user_id
        ), 0) < l.original_value then 'overdue'
      when coalesce((
        select sum(p.amount)
        from public.liability_payments p
        where p.liability_id = target_liability_id
          and p.user_id = target_user_id
      ), 0) > 0 then 'partial'
      else 'pending'
    end,
    completed_at = case
      when coalesce((
        select sum(p.amount)
        from public.liability_payments p
        where p.liability_id = target_liability_id
          and p.user_id = target_user_id
      ), 0) >= l.original_value then coalesce(l.completed_at, now())
      else null
    end
  where l.id = target_liability_id
    and l.user_id = target_user_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_liability_totals_after_payment_change
  on public.liability_payments;

create trigger sync_liability_totals_after_payment_change
after insert or update or delete on public.liability_payments
for each row
execute function public.sync_liability_payment_totals();

with income_sources(name, color) as (
  values
    ('inDrive rides', '#22c55e'),
    ('Toyota commission', '#06b6d4'),
    ('Website project payments', '#8b5cf6'),
    ('Salary', '#3b82f6'),
    ('Bonus', '#f59e0b'),
    ('Freelance income', '#14b8a6'),
    ('Other income', '#6b7280')
),
expense_roots(name, color) as (
  values
    ('Grocery', '#22c55e'),
    ('Household items', '#14b8a6'),
    ('Fuel', '#f97316'),
    ('Bills', '#f59e0b'),
    ('Rent', '#8b5cf6'),
    ('Food', '#ef4444'),
    ('Shopping', '#ec4899'),
    ('Family', '#3b82f6'),
    ('Car maintenance', '#06b6d4'),
    ('Mobile load', '#84cc16'),
    ('Internet', '#6366f1'),
    ('Medical', '#f43f5e'),
    ('Debt repayment', '#fb7185'),
    ('Other expenses', '#6b7280')
),
expense_children(parent_name, name, color) as (
  values
    ('Bills', 'Electricity bill', '#f59e0b'),
    ('Bills', 'Gas bill', '#f59e0b'),
    ('Bills', 'Water bill', '#f59e0b'),
    ('Food', 'Restaurant', '#ef4444'),
    ('Food', 'Tea and snacks', '#ef4444'),
    ('Fuel', 'Petrol', '#f97316'),
    ('Car maintenance', 'Oil change', '#06b6d4'),
    ('Car maintenance', 'Repairs', '#06b6d4'),
    ('Medical', 'Medicine', '#f43f5e'),
    ('Medical', 'Doctor fee', '#f43f5e'),
    ('Family', 'Home support', '#3b82f6')
),
users as (
  select id from auth.users
),
insert_income as (
  insert into public.categories(user_id, name, type, color)
  select u.id, s.name, 'income', s.color
  from users u
  cross join income_sources s
  where not exists (
    select 1 from public.categories c
    where c.user_id = u.id
      and c.type = 'income'
      and lower(c.name) = lower(s.name)
      and c.parent_id is null
  )
  returning id
),
insert_expense_roots as (
  insert into public.categories(user_id, name, type, color)
  select u.id, r.name, 'expense', r.color
  from users u
  cross join expense_roots r
  where not exists (
    select 1 from public.categories c
    where c.user_id = u.id
      and c.type = 'expense'
      and lower(c.name) = lower(r.name)
      and c.parent_id is null
  )
  returning id
)
insert into public.categories(user_id, name, type, color, parent_id)
select u.id, ch.name, 'expense', ch.color, parent.id
from users u
cross join expense_children ch
join public.categories parent
  on parent.user_id = u.id
 and parent.type = 'expense'
 and parent.parent_id is null
 and lower(parent.name) = lower(ch.parent_name)
where not exists (
  select 1 from public.categories c
  where c.user_id = u.id
    and c.type = 'expense'
    and lower(c.name) = lower(ch.name)
    and c.parent_id = parent.id
);
