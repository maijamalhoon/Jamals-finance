begin;

alter table public.transactions
  add column if not exists reference text;

alter table public.account_transfers
  add column if not exists reference text;

commit;
