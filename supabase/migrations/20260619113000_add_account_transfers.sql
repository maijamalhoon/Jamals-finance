create table if not exists public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null references public.accounts(id) on delete restrict,
  to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric not null check (amount > 0),
  transfer_date date not null default current_date,
  note text,
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id)
);

alter table public.account_transfers enable row level security;

drop policy if exists "Users can view their account transfers" on public.account_transfers;
create policy "Users can view their account transfers"
  on public.account_transfers
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their account transfers" on public.account_transfers;
create policy "Users can create their account transfers"
  on public.account_transfers
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their account transfers" on public.account_transfers;
create policy "Users can update their account transfers"
  on public.account_transfers
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their account transfers" on public.account_transfers;
create policy "Users can delete their account transfers"
  on public.account_transfers
  for delete
  using (auth.uid() = user_id);

create index if not exists idx_account_transfers_user_date
  on public.account_transfers(user_id, transfer_date desc);

create index if not exists idx_account_transfers_from_account
  on public.account_transfers(from_account_id);

create index if not exists idx_account_transfers_to_account
  on public.account_transfers(to_account_id);

create or replace function public.apply_account_transfer_balance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.accounts
    set balance = balance - new.amount
    where id = new.from_account_id and user_id = new.user_id;

    update public.accounts
    set balance = balance + new.amount
    where id = new.to_account_id and user_id = new.user_id;

    return new;
  elsif tg_op = 'UPDATE' then
    update public.accounts
    set balance = balance + old.amount
    where id = old.from_account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance - old.amount
    where id = old.to_account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance - new.amount
    where id = new.from_account_id and user_id = new.user_id;

    update public.accounts
    set balance = balance + new.amount
    where id = new.to_account_id and user_id = new.user_id;

    return new;
  elsif tg_op = 'DELETE' then
    update public.accounts
    set balance = balance + old.amount
    where id = old.from_account_id and user_id = old.user_id;

    update public.accounts
    set balance = balance - old.amount
    where id = old.to_account_id and user_id = old.user_id;

    return old;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_account_transfers_apply_balance on public.account_transfers;

create trigger trg_account_transfers_apply_balance
after insert or update or delete on public.account_transfers
for each row execute function public.apply_account_transfer_balance();
