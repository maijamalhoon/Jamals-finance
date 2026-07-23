export type BusinessFxAccount = {
  id: string;
  code: string;
  name: string;
};

export type BusinessFxRate = {
  id: string;
  currency: string;
  rate_date: string;
  rate_to_base: number;
  source: "manual" | "import" | "api";
  notes: string | null;
  created_at: string;
};

export type BusinessFxRun = {
  id: string;
  run_number: number;
  run_code: string;
  closing_date: string;
  status: "draft" | "posted" | "reversed" | "cancelled";
  exposure_count: number;
  skipped_bank_count: number;
  total_gain_base: number;
  total_loss_base: number;
  journal_entry_id: string | null;
  reversal_journal_entry_id: string | null;
  reversal_date: string | null;
  notes: string | null;
  created_at: string;
  posted_at: string | null;
  reversed_at: string | null;
};

export type BusinessFxLine = {
  id: string;
  revaluation_run_id: string;
  exposure_type: "sales_receivable" | "supplier_payable" | "bank_balance";
  exposure_id: string;
  exposure_code: string;
  account_id: string;
  currency: string;
  transaction_balance: number;
  carrying_base: number;
  rate_id: string;
  closing_rate: number;
  revalued_base: number;
  adjustment_base: number;
};

export type BusinessFxExposure = {
  id: string;
  code: string;
  date: string;
  due_date: string;
  currency: string;
  transaction_balance: number;
  carrying_base: number;
  latest_rate_date: string | null;
  latest_rate: number | null;
  estimated_base: number | null;
};

export type BusinessFxBank = {
  id: string;
  name: string;
  institution_name: string | null;
  currency: string;
  ledger_account_id: string;
  opening_balance_transaction: number;
  opening_balance_base: number;
  mixed_currency_ledger: boolean;
  latest_rate_date: string | null;
  latest_rate: number | null;
};

export type BusinessFxSettlement = {
  type: "sales_receipt" | "supplier_payment";
  id: string;
  document_id: string;
  document_code: string;
  payment_date: string;
  currency: string;
  transaction_amount: number;
  settlement_rate: number;
  carrying_base: number;
  settlement_base: number;
  realized_gain_base: number;
  realized_loss_base: number;
  journal_entry_id: string;
};

export type BusinessFxAudit = {
  id: number;
  rate_id: string | null;
  revaluation_run_id: string | null;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BusinessFxSnapshot = {
  base_currency: string;
  settings: {
    realized_gain_account?: BusinessFxAccount;
    realized_loss_account?: BusinessFxAccount;
    unrealized_gain_account?: BusinessFxAccount;
    unrealized_loss_account?: BusinessFxAccount;
  };
  summary: {
    rate_count: number;
    foreign_receivable_count: number;
    foreign_payable_count: number;
    foreign_bank_count: number;
    active_revaluation_count: number;
    realized_gain_base: number;
    realized_loss_base: number;
  };
  currencies: string[];
  rates: BusinessFxRate[];
  runs: BusinessFxRun[];
  lines: BusinessFxLine[];
  receivables: BusinessFxExposure[];
  payables: BusinessFxExposure[];
  foreign_banks: BusinessFxBank[];
  realized_settlements: BusinessFxSettlement[];
  audit: BusinessFxAudit[];
  capabilities: {
    can_view: boolean;
    can_manage: boolean;
    can_revalue: boolean;
  };
};
