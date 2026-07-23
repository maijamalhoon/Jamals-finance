"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  BriefcaseBusiness,
  Calculator,
  CircleDollarSign,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  UserPlus,
  UsersRound,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type {
  BusinessPayrollSnapshot,
  PayFrequency,
  PayrollComponent,
  PayrollRun,
} from "@/components/business/payroll/types";

export type { BusinessPayrollSnapshot } from "@/components/business/payroll/types";

type Props = {
  businessId: string;
  businessName: string;
  baseCurrency: string;
  today: string;
  snapshot: BusinessPayrollSnapshot;
};

type Editor = "employee" | "component" | "assignment" | "run" | null;

const inputClass =
  "finance-focus min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary";
const labelClass = "text-xs font-black text-text-secondary";

function monthRange(today: string) {
  const [year, month] = today.split("-").map(Number);
  return {
    startsOn: `${year}-${String(month).padStart(2, "0")}-01`,
    endsOn: new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10),
  };
}

function formatAmount(value: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatLabel(value: string) {
  return value.replace(/[_-]/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClasses(status: PayrollRun["status"]) {
  if (status === "paid") return "bg-success-soft text-success";
  if (status === "posted" || status === "approved") return "bg-primary-soft text-primary";
  if (status === "rejected" || status === "cancelled") return "bg-danger-soft text-danger";
  if (status === "pending_approval") return "bg-warning-soft text-warning";
  return "bg-surface-secondary text-text-secondary";
}

export default function BusinessPayrollWorkspace({
  businessId,
  businessName,
  baseCurrency,
  today,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const range = monthRange(today);
  const [editor, setEditor] = useState<Editor>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedRunId, setSelectedRunId] = useState(snapshot.runs[0]?.id ?? "");
  const [paymentAccountId, setPaymentAccountId] = useState(snapshot.payment_accounts[0]?.id ?? "");
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentReference, setPaymentReference] = useState("");

  const [employee, setEmployee] = useState({
    code: "",
    name: "",
    email: "",
    jobTitle: "",
    department: "",
    hireDate: today,
    branchId: "",
    frequency: "monthly" as PayFrequency,
    basePay: "",
  });
  const [component, setComponent] = useState({
    code: "",
    name: "",
    type: "earning" as PayrollComponent["component_type"],
    calculation: "fixed" as PayrollComponent["calculation_type"],
    value: "",
  });
  const [assignment, setAssignment] = useState({
    employeeId: snapshot.employees[0]?.id ?? "",
    componentId: snapshot.components[0]?.id ?? "",
    amountOverride: "",
    rateOverride: "",
    effectiveFrom: range.startsOn,
  });
  const [runDraft, setRunDraft] = useState({
    name: `${new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
      new Date(`${today}T00:00:00`),
    )} Payroll`,
    frequency: "monthly" as PayFrequency,
    periodStart: range.startsOn,
    periodEnd: range.endsOn,
    payDate: range.endsOn,
    branchId: "",
    notes: "",
  });

  const selectedRun = snapshot.runs.find((run) => run.id === selectedRunId) ?? snapshot.runs[0] ?? null;
  const selectedItems = selectedRun
    ? snapshot.items.filter((item) => item.payroll_run_id === selectedRun.id)
    : [];
  const selectedPayment = selectedRun
    ? snapshot.payments.find((payment) => payment.payroll_run_id === selectedRun.id) ?? null
    : null;

  async function action<T>(
    key: string,
    request: () => PromiseLike<{ data: T | null; error: { code?: string; message?: string } | null }>,
    success: string,
  ) {
    if (busyKey) return;
    setBusyKey(key);
    const { error } = await request();
    setBusyKey(null);
    if (error) {
      console.error("Payroll action failed", { key, code: error.code });
      toast.error(
        error.code === "42501"
          ? "You do not have permission for this payroll action."
          : error.message ?? "Payroll action could not be completed.",
      );
      return;
    }
    toast.success(success);
    router.refresh();
  }

  function saveEmployee() {
    const amount = Number(employee.basePay);
    if (!employee.code.trim() || !employee.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Employee code, name, and a valid base salary are required.");
      return;
    }
    void action(
      "employee",
      () =>
        supabase.rpc("upsert_business_employee", {
          p_business_id: businessId,
          p_employee_id: null,
          p_employee_code: employee.code,
          p_display_name: employee.name,
          p_member_user_id: null,
          p_branch_id: employee.branchId || null,
          p_email: employee.email || null,
          p_phone: null,
          p_job_title: employee.jobTitle || null,
          p_department: employee.department || null,
          p_hire_date: employee.hireDate,
          p_termination_date: null,
          p_status: "active",
          p_pay_frequency: employee.frequency,
          p_base_pay: amount,
          p_currency: baseCurrency,
          p_notes: null,
        }),
      "Employee added to the protected payroll register.",
    );
  }

  function saveComponent() {
    const value = Number(component.value);
    if (!component.code.trim() || !component.name.trim() || !Number.isFinite(value) || value < 0) {
      toast.error("Component code, name, and a valid value are required.");
      return;
    }
    void action(
      "component",
      () =>
        supabase.rpc("upsert_business_pay_component", {
          p_business_id: businessId,
          p_component_id: null,
          p_code: component.code,
          p_name: component.name,
          p_component_type: component.type,
          p_calculation_type: component.calculation,
          p_default_amount: component.calculation === "fixed" ? value : null,
          p_default_rate: component.calculation === "percentage" ? value : null,
          p_taxable: false,
          p_active: true,
        }),
      "Recurring pay component saved.",
    );
  }

  function saveAssignment() {
    if (!assignment.employeeId || !assignment.componentId) {
      toast.error("Choose an employee and a pay component.");
      return;
    }
    void action(
      "assignment",
      () =>
        supabase.rpc("upsert_business_employee_component", {
          p_business_id: businessId,
          p_assignment_id: null,
          p_employee_id: assignment.employeeId,
          p_component_id: assignment.componentId,
          p_amount_override: assignment.amountOverride ? Number(assignment.amountOverride) : null,
          p_rate_override: assignment.rateOverride ? Number(assignment.rateOverride) : null,
          p_active: true,
          p_effective_from: assignment.effectiveFrom,
          p_effective_to: null,
        }),
      "Pay component assigned to employee.",
    );
  }

  function createRun() {
    if (!runDraft.name.trim() || runDraft.periodStart > runDraft.periodEnd) {
      toast.error("Payroll name and a valid period are required.");
      return;
    }
    void action(
      "run",
      () =>
        supabase.rpc("create_business_payroll_run", {
          p_business_id: businessId,
          p_name: runDraft.name,
          p_pay_frequency: runDraft.frequency,
          p_period_start: runDraft.periodStart,
          p_period_end: runDraft.periodEnd,
          p_pay_date: runDraft.payDate,
          p_branch_id: runDraft.branchId || null,
          p_notes: runDraft.notes || null,
        }),
      "Draft payroll run created.",
    );
  }

  function payRun(run: PayrollRun) {
    if (!paymentAccountId) {
      toast.error("Choose a cash or bank account.");
      return;
    }
    void action(
      `pay-${run.id}`,
      () =>
        supabase.rpc("pay_business_payroll_run", {
          p_business_id: businessId,
          p_run_id: run.id,
          p_payment_account_id: paymentAccountId,
          p_payment_date: paymentDate,
          p_reference: paymentReference || null,
        }),
      "Net salary payment posted and payroll marked paid.",
    );
  }

  const summaryCards = [
    ["Active employees", snapshot.summary.active_employees],
    ["Draft runs", snapshot.summary.draft_runs],
    ["Pending approval", snapshot.summary.pending_runs],
    ["Approved runs", snapshot.summary.approved_runs],
    ["Unpaid net", formatAmount(snapshot.summary.unpaid_net, baseCurrency)],
  ];

  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Employee payroll</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{businessName}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
              Salary records, recurring pay rules, independent approvals, balanced accruals, and controlled salary payments share the business ledger.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.refresh()}>
            <RefreshCw aria-hidden="true" /> Refresh
          </Button>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map(([label, value]) => (
            <article key={label} className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-bold text-text-secondary">{label}</p>
              <strong className="mt-2 block text-xl font-black text-text-primary">{value}</strong>
            </article>
          ))}
        </section>

        <section className="mt-6 rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {snapshot.capabilities.can_manage ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setEditor("employee")}><UserPlus /> Add employee</Button>
                <Button size="sm" variant="outline" onClick={() => setEditor("component")}><Settings2 /> Add component</Button>
                <Button size="sm" variant="outline" onClick={() => setEditor("assignment")}><Plus /> Assign component</Button>
              </>
            ) : null}
            {snapshot.capabilities.can_process ? (
              <Button size="sm" onClick={() => setEditor("run")}><WalletCards /> Create payroll run</Button>
            ) : null}
          </div>
          {editor ? (
            <EditorCard title={formatLabel(editor)} onClose={() => setEditor(null)}>
              {editor === "employee" ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Employee code"><input className={inputClass} value={employee.code} onChange={(e) => setEmployee({ ...employee, code: e.target.value })} /></Field>
                  <Field label="Display name"><input className={inputClass} value={employee.name} onChange={(e) => setEmployee({ ...employee, name: e.target.value })} /></Field>
                  <Field label="Base salary"><input className={inputClass} inputMode="decimal" value={employee.basePay} onChange={(e) => setEmployee({ ...employee, basePay: e.target.value })} /></Field>
                  <Field label="Frequency"><FrequencySelect value={employee.frequency} onChange={(frequency) => setEmployee({ ...employee, frequency })} /></Field>
                  <Field label="Hire date"><input className={inputClass} type="date" value={employee.hireDate} onChange={(e) => setEmployee({ ...employee, hireDate: e.target.value })} /></Field>
                  <Field label="Branch"><BranchSelect branches={snapshot.branches} value={employee.branchId} onChange={(branchId) => setEmployee({ ...employee, branchId })} /></Field>
                  <Field label="Email"><input className={inputClass} type="email" value={employee.email} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} /></Field>
                  <Field label="Job title"><input className={inputClass} value={employee.jobTitle} onChange={(e) => setEmployee({ ...employee, jobTitle: e.target.value })} /></Field>
                  <div><Button loading={busyKey === "employee"} onClick={saveEmployee}><UserPlus /> Save employee</Button></div>
                </div>
              ) : null}

              {editor === "component" ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Code"><input className={inputClass} value={component.code} onChange={(e) => setComponent({ ...component, code: e.target.value })} /></Field>
                  <Field label="Name"><input className={inputClass} value={component.name} onChange={(e) => setComponent({ ...component, name: e.target.value })} /></Field>
                  <Field label="Type"><select className={inputClass} value={component.type} onChange={(e) => setComponent({ ...component, type: e.target.value as PayrollComponent["component_type"] })}><option value="earning">Earning</option><option value="deduction">Deduction</option><option value="employer_cost">Employer cost</option></select></Field>
                  <Field label="Calculation"><select className={inputClass} value={component.calculation} onChange={(e) => setComponent({ ...component, calculation: e.target.value as PayrollComponent["calculation_type"] })}><option value="fixed">Fixed amount</option><option value="percentage">Percentage of base</option></select></Field>
                  <Field label={component.calculation === "fixed" ? "Amount" : "Rate %"}><input className={inputClass} inputMode="decimal" value={component.value} onChange={(e) => setComponent({ ...component, value: e.target.value })} /></Field>
                  <div><Button loading={busyKey === "component"} onClick={saveComponent}><Settings2 /> Save component</Button></div>
                </div>
              ) : null}

              {editor === "assignment" ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Employee"><select className={inputClass} value={assignment.employeeId} onChange={(e) => setAssignment({ ...assignment, employeeId: e.target.value })}>{snapshot.employees.map((row) => <option key={row.id} value={row.id}>{row.employee_code} · {row.display_name}</option>)}</select></Field>
                  <Field label="Component"><select className={inputClass} value={assignment.componentId} onChange={(e) => setAssignment({ ...assignment, componentId: e.target.value })}>{snapshot.components.map((row) => <option key={row.id} value={row.id}>{row.code} · {row.name}</option>)}</select></Field>
                  <Field label="Amount override"><input className={inputClass} inputMode="decimal" value={assignment.amountOverride} onChange={(e) => setAssignment({ ...assignment, amountOverride: e.target.value })} placeholder="Optional" /></Field>
                  <Field label="Rate override %"><input className={inputClass} inputMode="decimal" value={assignment.rateOverride} onChange={(e) => setAssignment({ ...assignment, rateOverride: e.target.value })} placeholder="Optional" /></Field>
                  <Field label="Effective from"><input className={inputClass} type="date" value={assignment.effectiveFrom} onChange={(e) => setAssignment({ ...assignment, effectiveFrom: e.target.value })} /></Field>
                  <div><Button loading={busyKey === "assignment"} onClick={saveAssignment}><Plus /> Assign component</Button></div>
                </div>
              ) : null}

              {editor === "run" ? (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Run name"><input className={inputClass} value={runDraft.name} onChange={(e) => setRunDraft({ ...runDraft, name: e.target.value })} /></Field>
                  <Field label="Frequency"><FrequencySelect value={runDraft.frequency} onChange={(frequency) => setRunDraft({ ...runDraft, frequency })} /></Field>
                  <Field label="Period start"><input className={inputClass} type="date" value={runDraft.periodStart} onChange={(e) => setRunDraft({ ...runDraft, periodStart: e.target.value })} /></Field>
                  <Field label="Period end"><input className={inputClass} type="date" value={runDraft.periodEnd} onChange={(e) => setRunDraft({ ...runDraft, periodEnd: e.target.value })} /></Field>
                  <Field label="Pay date"><input className={inputClass} type="date" min={runDraft.periodStart} value={runDraft.payDate} onChange={(e) => setRunDraft({ ...runDraft, payDate: e.target.value })} /></Field>
                  <Field label="Branch"><BranchSelect branches={snapshot.branches} value={runDraft.branchId} onChange={(branchId) => setRunDraft({ ...runDraft, branchId })} /></Field>
                  <Field label="Notes"><input className={inputClass} value={runDraft.notes} onChange={(e) => setRunDraft({ ...runDraft, notes: e.target.value })} /></Field>
                  <div><Button loading={busyKey === "run"} onClick={createRun}><WalletCards /> Create draft</Button></div>
                </div>
              ) : null}
            </EditorCard>
          ) : null}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[0.78fr_1.5fr]">
          <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
            <h2 className="text-lg font-black text-text-primary">Payroll runs</h2>
            <div className="mt-4 space-y-2">
              {snapshot.runs.length ? snapshot.runs.map((run) => (
                <button key={run.id} type="button" onClick={() => setSelectedRunId(run.id)} className={`finance-focus w-full rounded-[var(--radius-button)] px-4 py-3 text-left ${selectedRun?.id === run.id ? "bg-primary-soft" : "bg-surface-secondary"}`}>
                  <div className="flex items-start justify-between gap-3"><strong className="text-sm text-text-primary">{run.run_code} · {run.name}</strong><span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${statusClasses(run.status)}`}>{formatLabel(run.status)}</span></div>
                  <p className="mt-1 text-xs text-text-secondary">{formatDate(run.period_start)} – {formatDate(run.period_end)} · {run.employee_count} employee(s)</p>
                  <strong className="mt-2 block text-sm text-primary">{formatAmount(run.net_total, run.currency)} net</strong>
                </button>
              )) : <EmptyState icon={ReceiptText} text="No payroll runs created yet." />}
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
            {selectedRun ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{selectedRun.run_code}</p><h2 className="mt-1 text-xl font-black text-text-primary">{selectedRun.name}</h2><p className="mt-1 text-sm text-text-secondary">Pay date {formatDate(selectedRun.pay_date)}{selectedRun.branch_name ? ` · ${selectedRun.branch_name}` : ""}</p></div>
                  <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${statusClasses(selectedRun.status)}`}>{formatLabel(selectedRun.status)}</span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[ ["Gross", selectedRun.gross_total], ["Deductions", selectedRun.deduction_total], ["Net pay", selectedRun.net_total], ["Employer cost", selectedRun.employer_cost_total] ].map(([label, value]) => <div key={label} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3"><span className="text-xs text-text-secondary">{label}</span><strong className="mt-1 block text-base text-text-primary">{formatAmount(Number(value), selectedRun.currency)}</strong></div>)}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {selectedRun.status === "draft" && snapshot.capabilities.can_process ? <Button size="sm" loading={busyKey === `calculate-${selectedRun.id}`} onClick={() => void action(`calculate-${selectedRun.id}`, () => supabase.rpc("recalculate_business_payroll_run", { p_business_id: businessId, p_run_id: selectedRun.id }), "Payroll recalculated from active employee rules.")}><Calculator /> Recalculate</Button> : null}
                  {selectedRun.status === "draft" && snapshot.capabilities.can_process ? <Button size="sm" variant="outline" loading={busyKey === `submit-${selectedRun.id}`} onClick={() => void action(`submit-${selectedRun.id}`, () => supabase.rpc("submit_business_payroll_run", { p_business_id: businessId, p_run_id: selectedRun.id, p_assigned_to: null }), "Payroll sent for independent approval.")}><Send /> Submit approval</Button> : null}
                  {selectedRun.status === "rejected" && snapshot.capabilities.can_process ? <Button size="sm" variant="outline" loading={busyKey === `reopen-${selectedRun.id}`} onClick={() => void action(`reopen-${selectedRun.id}`, () => supabase.rpc("reopen_rejected_business_payroll_run", { p_business_id: businessId, p_run_id: selectedRun.id }), "Rejected payroll reopened as draft.")}><RotateCcw /> Reopen draft</Button> : null}
                  {selectedRun.status === "approved" && snapshot.capabilities.can_process ? <Button size="sm" loading={busyKey === `post-${selectedRun.id}`} onClick={() => void action(`post-${selectedRun.id}`, () => supabase.rpc("post_business_payroll_run", { p_business_id: businessId, p_run_id: selectedRun.id }), "Balanced payroll journal posted.")}><BadgeCheck /> Post accounting</Button> : null}
                  {(["draft", "rejected"] as const).includes(selectedRun.status as "draft" | "rejected") && snapshot.capabilities.can_process ? <Button size="sm" variant="ghost" loading={busyKey === `cancel-${selectedRun.id}`} onClick={() => void action(`cancel-${selectedRun.id}`, () => supabase.rpc("cancel_business_payroll_run", { p_business_id: businessId, p_run_id: selectedRun.id, p_reason: "Cancelled from payroll workspace" }), "Payroll run cancelled.")}><XCircle /> Cancel</Button> : null}
                </div>

                {selectedRun.status === "posted" && snapshot.capabilities.can_pay ? (
                  <div className="mt-5 rounded-[var(--radius-button)] bg-primary-soft px-4 py-4">
                    <div className="flex items-center gap-2 text-primary"><Banknote className="size-4" /><strong className="text-sm">Settle net payroll</strong></div>
                    <p className="mt-1 text-xs leading-5 text-text-secondary">This pays employee net salary only. Employee deductions and employer contributions remain separate liabilities until remitted.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <Field label="Cash or bank account"><select className={inputClass} value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)}>{snapshot.payment_accounts.map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select></Field>
                      <Field label="Payment date"><input className={inputClass} type="date" min={selectedRun.period_end} value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} /></Field>
                      <Field label="Reference"><input className={inputClass} value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} /></Field>
                    </div>
                    <Button className="mt-3" disabled={!snapshot.payment_accounts.length} loading={busyKey === `pay-${selectedRun.id}`} onClick={() => payRun(selectedRun)}><Banknote /> Pay {formatAmount(selectedRun.net_total, selectedRun.currency)}</Button>
                  </div>
                ) : null}

                {selectedPayment ? <div className="mt-5 flex flex-wrap items-center gap-2 rounded-[var(--radius-button)] bg-success-soft px-4 py-3 text-sm text-success"><CircleDollarSign className="size-4" /><strong>Paid {formatAmount(selectedPayment.amount, selectedRun.currency)}</strong><span>on {formatDate(selectedPayment.payment_date)}</span>{selectedPayment.reference ? <span>· {selectedPayment.reference}</span> : null}</div> : null}

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[720px] border-separate border-spacing-y-2 text-sm">
                    <thead><tr className="text-left text-xs text-text-secondary"><th className="px-3">Employee</th><th className="px-3">Base</th><th className="px-3">Earnings</th><th className="px-3">Deductions</th><th className="px-3">Net</th><th className="px-3">Employer cost</th></tr></thead>
                    <tbody>{selectedItems.map((item) => <tr key={item.id} className="bg-surface-secondary"><td className="rounded-l-[var(--radius-button)] px-3 py-3"><strong>{item.employee_code}</strong><span className="ml-2 text-text-secondary">{item.employee_name}</span></td><td className="px-3">{formatAmount(item.base_pay, selectedRun.currency)}</td><td className="px-3">{formatAmount(item.earnings_total, selectedRun.currency)}</td><td className="px-3">{formatAmount(item.deduction_total, selectedRun.currency)}</td><td className="px-3 font-black">{formatAmount(item.net_pay, selectedRun.currency)}</td><td className="rounded-r-[var(--radius-button)] px-3">{formatAmount(item.employer_cost_total, selectedRun.currency)}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            ) : <EmptyState icon={ReceiptText} text="Choose a payroll run to inspect its calculations and workflow." />}
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <ListSection title="Payroll register" icon={<UsersRound className="size-5 text-primary" />}>
            {snapshot.employees.length ? snapshot.employees.map((row) => <article key={row.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-text-primary">{row.employee_code} · {row.display_name}</strong><p className="mt-1 text-xs text-text-secondary">{row.job_title ?? "No job title"}{row.department ? ` · ${row.department}` : ""}</p></div><strong className="text-sm text-primary">{formatAmount(row.base_pay, row.currency)}</strong></div></article>) : <EmptyState icon={BriefcaseBusiness} text="No employees in payroll yet." />}
          </ListSection>
          <ListSection title="Pay components" icon={<Settings2 className="size-5 text-primary" />}>
            {snapshot.components.length ? snapshot.components.map((row) => <article key={row.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3"><div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-text-primary">{row.code} · {row.name}</strong><p className="mt-1 text-xs text-text-secondary">{formatLabel(row.component_type)} · {formatLabel(row.calculation_type)}</p></div><strong className="text-sm text-primary">{row.calculation_type === "fixed" ? formatAmount(row.default_amount ?? 0, baseCurrency) : `${row.default_rate ?? 0}%`}</strong></div></article>) : <EmptyState icon={Settings2} text="No recurring pay components configured." />}
          </ListSection>
        </div>

        <section className="mt-6 rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-text-primary">Payroll audit trail</h2><ShieldCheck className="size-5 text-primary" /></div>
          <div className="mt-4 grid gap-2 lg:grid-cols-2">{snapshot.audit.slice(0, 12).map((entry) => <article key={String(entry.id)} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3"><div className="flex items-start justify-between gap-3"><strong className="text-sm text-text-primary">{formatLabel(entry.action)}</strong><span className="text-xs text-text-secondary">{formatDateTime(entry.created_at)}</span></div><p className="mt-1 text-xs text-text-secondary">{entry.actor_name}</p></article>)}</div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5"><span className={labelClass}>{label}</span>{children}</label>;
}

function FrequencySelect({ value, onChange }: { value: PayFrequency; onChange: (value: PayFrequency) => void }) {
  return <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value as PayFrequency)}><option value="monthly">Monthly</option><option value="biweekly">Biweekly</option><option value="weekly">Weekly</option></select>;
}

function BranchSelect({ branches, value, onChange }: { branches: BusinessPayrollSnapshot["branches"]; value: string; onChange: (value: string) => void }) {
  return <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}><option value="">All accessible branches</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select>;
}

function EditorCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="mt-4 border-t border-border pt-4"><div className="flex items-center justify-between gap-3"><h2 className="font-black text-text-primary">{title}</h2><Button size="sm" variant="ghost" onClick={onClose}>Close</Button></div><div className="mt-4">{children}</div></div>;
}

function ListSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6"><div className="flex items-center justify-between gap-3"><h2 className="text-lg font-black text-text-primary">{title}</h2>{icon}</div><div className="mt-4 space-y-2">{children}</div></section>;
}

function EmptyState({ icon: Icon, text }: { icon: typeof Plus; text: string }) {
  return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center"><Icon className="mx-auto size-5 text-text-tertiary" /><p className="mt-2 text-sm text-text-secondary">{text}</p></div>;
}
