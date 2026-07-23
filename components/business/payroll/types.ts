export type PayFrequency = "monthly" | "biweekly" | "weekly";
export type PayrollRunStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "posted"
  | "paid"
  | "cancelled";

export type PayrollEmployee = {
  id: string;
  employee_code: string;
  display_name: string;
  member_user_id: string | null;
  branch_id: string | null;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department: string | null;
  hire_date: string;
  termination_date: string | null;
  status: "active" | "inactive" | "terminated";
  pay_frequency: PayFrequency;
  base_pay: number;
  currency: string;
  notes: string | null;
};

export type PayrollComponent = {
  id: string;
  code: string;
  name: string;
  component_type: "earning" | "deduction" | "employer_cost";
  calculation_type: "fixed" | "percentage";
  default_amount: number | null;
  default_rate: number | null;
  taxable: boolean;
  active: boolean;
};

export type PayrollEmployeeComponent = {
  id: string;
  employee_id: string;
  component_id: string;
  component_code: string;
  component_name: string;
  component_type: PayrollComponent["component_type"];
  calculation_type: PayrollComponent["calculation_type"];
  amount_override: number | null;
  rate_override: number | null;
  active: boolean;
  effective_from: string;
  effective_to: string | null;
};

export type PayrollRun = {
  id: string;
  run_no: number;
  run_code: string;
  branch_id: string | null;
  branch_name: string | null;
  name: string;
  pay_frequency: PayFrequency;
  period_start: string;
  period_end: string;
  pay_date: string;
  currency: string;
  status: PayrollRunStatus;
  approval_status: string | null;
  approval_request_id: string | null;
  payroll_journal_entry_id: string | null;
  payment_journal_entry_id: string | null;
  gross_total: number;
  deduction_total: number;
  net_total: number;
  employer_cost_total: number;
  employee_count: number;
  notes: string | null;
  created_at: string;
};

export type PayrollItem = {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_code: string;
  employee_name: string;
  branch_id: string | null;
  base_pay: number;
  earnings_total: number;
  gross_pay: number;
  deduction_total: number;
  net_pay: number;
  employer_cost_total: number;
};

export type PayrollItemLine = {
  id: string;
  payroll_item_id: string;
  component_id: string | null;
  component_code: string;
  component_name: string;
  component_type: PayrollComponent["component_type"];
  calculation_type: PayrollComponent["calculation_type"];
  basis_amount: number;
  rate: number | null;
  amount: number;
};

export type PayrollPayment = {
  id: string;
  payroll_run_id: string;
  payment_account_id: string;
  journal_entry_id: string;
  payment_date: string;
  amount: number;
  reference: string | null;
};

export type PayrollBranch = {
  id: string;
  code: string;
  name: string;
  is_primary: boolean;
};

export type PayrollMember = {
  user_id: string;
  name: string;
  email: string | null;
  role: string;
};

export type PayrollPaymentAccount = {
  id: string;
  code: string;
  name: string;
  system_key: string | null;
};

export type PayrollAudit = {
  id: number | string;
  employee_id: string | null;
  payroll_run_id: string | null;
  actor_user_id: string | null;
  actor_name: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BusinessPayrollSnapshot = {
  summary: {
    active_employees: number;
    draft_runs: number;
    pending_runs: number;
    approved_runs: number;
    unpaid_net: number;
  };
  settings: Record<string, unknown> | null;
  employees: PayrollEmployee[];
  components: PayrollComponent[];
  employee_components: PayrollEmployeeComponent[];
  runs: PayrollRun[];
  items: PayrollItem[];
  lines: PayrollItemLine[];
  payments: PayrollPayment[];
  branches: PayrollBranch[];
  members: PayrollMember[];
  payment_accounts: PayrollPaymentAccount[];
  audit: PayrollAudit[];
  capabilities: {
    can_manage: boolean;
    can_process: boolean;
    can_pay: boolean;
  };
};
