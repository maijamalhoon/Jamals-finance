create index if not exists business_bank_matches_journal_idx
  on public.business_bank_matches (business_id, journal_line_id);

create index if not exists business_bank_reconciliations_import_idx
  on public.business_bank_reconciliations (business_id, statement_import_id);
