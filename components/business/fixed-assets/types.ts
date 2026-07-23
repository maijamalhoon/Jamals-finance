export type DepreciationConvention = "full_month" | "next_month";
export type AssetStatus =
  | "draft"
  | "active"
  | "fully_depreciated"
  | "disposed"
  | "written_off"
  | "cancelled";

export type AssetAccount = {
  id: string;
  code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "revenue" | "expense";
  account_subtype?: string | null;
  normal_balance: "debit" | "credit";
  system_key?: string | null;
};

export type AssetCategory = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  asset_account_id: string;
  accumulated_depreciation_account_id: string;
  depreciation_expense_account_id: string;
  default_useful_life_months: number;
  default_residual_rate: number;
  default_depreciation_method: "straight_line";
  default_depreciation_convention: DepreciationConvention;
  active: boolean;
  asset_account_code: string;
  asset_account_name: string;
  accumulated_account_code: string;
  accumulated_account_name: string;
  expense_account_code: string;
  expense_account_name: string;
};

export type FixedAsset = {
  id: string;
  asset_no: number;
  asset_display_code: string;
  category_id: string;
  category_code: string;
  category_name: string;
  branch_id: string | null;
  branch_name: string | null;
  asset_code: string;
  name: string;
  description: string | null;
  serial_number: string | null;
  location: string | null;
  acquisition_date: string;
  in_service_date: string;
  original_cost: number;
  residual_value: number;
  useful_life_months: number;
  depreciation_method: "straight_line";
  depreciation_convention: DepreciationConvention;
  status: AssetStatus;
  capitalization_counter_account_id: string | null;
  capitalization_journal_entry_id: string | null;
  capitalization_journal_number: number | null;
  accumulated_depreciation: number;
  book_value: number;
  last_depreciation_period_end: string | null;
  disposal_date: string | null;
  disposal_proceeds: number | null;
  disposal_account_id: string | null;
  disposal_journal_entry_id: string | null;
  disposal_journal_number: number | null;
  disposal_gain: number | null;
  disposal_loss: number | null;
  created_at: string;
};

export type DepreciationRun = {
  id: string;
  run_no: number;
  run_code: string;
  branch_id: string | null;
  branch_name: string | null;
  period_start: string;
  period_end: string;
  posting_date: string;
  status: "draft" | "posted" | "cancelled";
  asset_count: number;
  total_depreciation: number;
  journal_entry_id: string | null;
  journal_number: number | null;
  notes: string | null;
  created_at: string;
};

export type DepreciationLine = {
  id: string;
  depreciation_run_id: string;
  asset_id: string;
  asset_code: string;
  asset_name: string;
  opening_accumulated_depreciation: number;
  depreciation_amount: number;
  closing_accumulated_depreciation: number;
  closing_book_value: number;
};

export type AssetBranch = {
  id: string;
  code: string;
  name: string;
  is_primary: boolean;
};

export type AssetAudit = {
  id: number | string;
  asset_id: string | null;
  depreciation_run_id: string | null;
  actor_user_id: string | null;
  actor_name: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BusinessAssetsSnapshot = {
  summary: {
    draft_assets: number;
    active_assets: number;
    original_cost: number;
    accumulated_depreciation: number;
    net_book_value: number;
    draft_runs: number;
  };
  settings: {
    default_depreciation_method: "straight_line";
    default_depreciation_convention: DepreciationConvention;
    gain_on_disposal_account_id: string;
    loss_on_disposal_account_id: string;
  } | null;
  categories: AssetCategory[];
  assets: FixedAsset[];
  runs: DepreciationRun[];
  lines: DepreciationLine[];
  branches: AssetBranch[];
  asset_accounts: AssetAccount[];
  counter_accounts: AssetAccount[];
  disposal_accounts: AssetAccount[];
  audit: AssetAudit[];
  capabilities: {
    can_manage: boolean;
    can_depreciate: boolean;
    can_dispose: boolean;
  };
};
