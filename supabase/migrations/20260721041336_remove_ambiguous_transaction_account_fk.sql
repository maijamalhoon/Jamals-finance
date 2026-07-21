-- Keep the owner-aware composite relationship as the single authoritative
-- transactions-to-accounts foreign key. The legacy single-column constraint
-- duplicated the same relationship in PostgREST and caused PGRST201 on
-- dashboard, transaction-history, and export embeds.
alter table public.transactions
  drop constraint if exists transactions_account_id_fkey;
