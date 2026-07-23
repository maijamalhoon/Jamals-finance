"use client";

import { type FormEvent, useMemo, useState } from "react";
import {
  BadgePercent,
  Calculator,
  CalendarCheck2,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  ShieldCheck,
} from "@/components/icons/jalvoro/compat";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type TaxCode = {
  id: string;
  code: string;
  name: string;
  treatment: string;
  applicability: string;
  rate: number | string;
  recoverable_percent: number | string;
  is_active: boolean;
};

type TaxSettings = {
  tax_enabled?: boolean;
  registration_number?: string | null;
  filing_frequency?: string;
  prices_include_tax?: boolean;
  rounding_method?: string;
  default_sales_tax_code_id?: string | null;
  default_purchase_tax_code_id?: string | null;
};

type Filing = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  output_tax_base: number | string;
  input_tax_base: number | string;
  net_tax_base: number | string;
  filed_at?: string | null;
  paid_at?: string | null;
};

type FiscalPeriod = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: "open" | "closed" | "locked";
  closing_net_income_base?: number | string | null;
  close_journal_entry_id?: string | null;
  reopen_journal_entry_id?: string | null;
  closed_at?: string | null;
  locked_at?: string | null;
};

type CloseRun = {
  id: string;
  action: "close" | "lock" | "reopen";
  net_income_base?: number | string | null;
  performed_at: string;
  notes?: string | null;
};

type TaxSnapshot = {
  settings?: TaxSettings;
  tax_codes?: TaxCode[];
  summary?: Record<string, number | string>;
  rate_breakdown?: Array<{
    source_kind: string;
    rate: number | string;
    taxable_base: number | string;
    tax_base: number | string;
  }>;
  source_counts?: Record<string, number>;
  filings?: Filing[];
};

export type BusinessTaxClosingSnapshot = {
  tax?: TaxSnapshot;
  fiscal_periods?: FiscalPeriod[];
  close_runs?: CloseRun[];
  can_manage?: boolean;
};

type Props = {
  businessId: string;
  businessName: string;
  businessSlug: string;
  baseCurrency: string;
  initialStart: string;
  initialEnd: string;
  snapshot: BusinessTaxClosingSnapshot;
};

function amount(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function title(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default function BusinessTaxClosingWorkspace({
  businessId,
  businessName,
  businessSlug,
  baseCurrency,
  initialStart,
  initialEnd,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const tax = snapshot.tax ?? {};
  const summary = tax.summary ?? {};
  const codes = tax.tax_codes ?? [];
  const filings = tax.filings ?? [];
  const periods = snapshot.fiscal_periods ?? [];
  const runs = snapshot.close_runs ?? [];
  const canManage = snapshot.can_manage === true;

  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [saving, setSaving] = useState<string | null>(null);
  const [pendingPeriodAction, setPendingPeriodAction] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    taxEnabled: tax.settings?.tax_enabled === true,
    registration: tax.settings?.registration_number ?? "",
    frequency: tax.settings?.filing_frequency ?? "monthly",
    inclusive: tax.settings?.prices_include_tax === true,
    rounding: tax.settings?.rounding_method ?? "per_line",
    defaultSales: tax.settings?.default_sales_tax_code_id ?? "",
    defaultPurchase: tax.settings?.default_purchase_tax_code_id ?? "",
  });
  const [codeForm, setCodeForm] = useState({
    code: "",
    name: "",
    treatment: "standard",
    applicability: "both",
    rate: "",
    recoverable: "100",
  });
  const [calculatorForm, setCalculatorForm] = useState({
    codeId: codes.find((code) => code.is_active)?.id ?? "",
    value: "100",
    inclusive: false,
  });
  const [calculatorResult, setCalculatorResult] = useState<Record<string, unknown> | null>(null);

  function money(value: unknown) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: baseCurrency,
      maximumFractionDigits: 2,
    }).format(amount(value));
  }

  function refresh() {
    router.refresh();
  }

  function applyRange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!start || !end || end < start) {
      toast.error("Choose a valid tax period.");
      return;
    }
    router.push(`/business/${businessSlug}/tax-closing?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving) return;
    setSaving("settings");
    const { error } = await supabase.rpc("save_business_tax_settings", {
      p_business_id: businessId,
      p_tax_enabled: settings.taxEnabled,
      p_registration_number: settings.registration,
      p_filing_frequency: settings.frequency,
      p_prices_include_tax: settings.inclusive,
      p_rounding_method: settings.rounding,
      p_default_sales_tax_code_id: settings.defaultSales || null,
      p_default_purchase_tax_code_id: settings.defaultPurchase || null,
    });
    setSaving(null);
    if (error) {
      console.error("Tax settings save failed", { code: error.code });
      toast.error("Tax settings could not be saved.");
      return;
    }
    toast.success("Tax settings saved.");
    refresh();
  }

  async function createTaxCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || saving) return;
    const rate = codeForm.treatment === "standard" ? Number(codeForm.rate) : 0;
    const recoverable = Number(codeForm.recoverable);
    if (!codeForm.code.trim() || codeForm.name.trim().length < 2 || !Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast.error("Enter a valid tax code, name, and rate.");
      return;
    }
    setSaving("code");
    const { error } = await supabase.rpc("upsert_business_tax_code", {
      p_business_id: businessId,
      p_tax_code_id: null,
      p_code: codeForm.code.trim().toUpperCase(),
      p_name: codeForm.name.trim(),
      p_treatment: codeForm.treatment,
      p_applicability: codeForm.applicability,
      p_rate: rate,
      p_recoverable_percent: Number.isFinite(recoverable) ? recoverable : 100,
      p_output_account_id: null,
      p_input_account_id: null,
      p_effective_from: null,
      p_effective_to: null,
      p_is_active: true,
    });
    setSaving(null);
    if (error) {
      console.error("Tax code create failed", { code: error.code });
      toast.error(error.code === "23505" ? "That tax code already exists." : "Tax code could not be created.");
      return;
    }
    setCodeForm({ code: "", name: "", treatment: "standard", applicability: "both", rate: "", recoverable: "100" });
    toast.success("Tax code created.");
    refresh();
  }

  async function calculateTax(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!calculatorForm.codeId || amount(calculatorForm.value) < 0) {
      toast.error("Select a tax code and enter a valid amount.");
      return;
    }
    setSaving("calculator");
    const { data, error } = await supabase.rpc("calculate_business_tax", {
      p_business_id: businessId,
      p_tax_code_id: calculatorForm.codeId,
      p_amount: amount(calculatorForm.value),
      p_tax_inclusive: calculatorForm.inclusive,
    });
    setSaving(null);
    if (error) {
      console.error("Tax calculation failed", { code: error.code });
      toast.error("Tax could not be calculated.");
      return;
    }
    setCalculatorResult((data ?? {}) as Record<string, unknown>);
  }

  async function prepareFiling() {
    if (!canManage || saving) return;
    setSaving("filing");
    const { error } = await supabase.rpc("prepare_business_tax_filing", {
      p_business_id: businessId,
      p_period_start: start,
      p_period_end: end,
      p_notes: null,
    });
    setSaving(null);
    if (error) {
      console.error("Tax filing prepare failed", { code: error.code });
      toast.error("Tax filing could not be prepared.");
      return;
    }
    toast.success("Tax filing snapshot prepared.");
    refresh();
  }

  async function changeFilingStatus(filingId: string, status: "filed" | "paid" | "void") {
    if (!canManage || saving) return;
    setSaving(`filing-${filingId}`);
    const { error } = await supabase.rpc("set_business_tax_filing_status", {
      p_business_id: businessId,
      p_filing_id: filingId,
      p_status: status,
    });
    setSaving(null);
    if (error) {
      console.error("Tax filing status failed", { code: error.code });
      toast.error("Tax filing status could not be changed.");
      return;
    }
    toast.success(`Tax filing marked ${status}.`);
    refresh();
  }

  async function runPeriodAction(period: FiscalPeriod, action: "close" | "lock" | "reopen") {
    if (!canManage || saving) return;
    const confirmationKey = `${period.id}:${action}`;
    if (pendingPeriodAction !== confirmationKey) {
      setPendingPeriodAction(confirmationKey);
      toast.message(`Press ${title(action)} again to confirm.`);
      return;
    }
    setPendingPeriodAction(null);
    setSaving(confirmationKey);
    const rpcName = action === "close"
      ? "close_business_fiscal_period"
      : action === "lock"
        ? "lock_business_fiscal_period"
        : "reopen_business_fiscal_period";
    const { error } = await supabase.rpc(rpcName, {
      p_business_id: businessId,
      p_fiscal_period_id: period.id,
      p_notes: null,
    });
    setSaving(null);
    if (error) {
      console.error("Fiscal period action failed", { code: error.code, action });
      toast.error(action === "lock" ? "Period could not be locked. Resolve draft filings first." : `Period could not be ${action}d.`);
      return;
    }
    toast.success(action === "close" ? "Fiscal period closed." : action === "lock" ? "Fiscal period permanently locked." : "Fiscal period reopened with a reversal journal.");
    refresh();
  }

  const summaryCards = [
    ["Output tax", summary.output_tax, "Collected after customer returns"],
    ["Input tax", summary.input_tax, "Recoverable after supplier returns"],
    [amount(summary.net_tax) >= 0 ? "Tax payable" : "Tax credit", amount(summary.net_tax) >= 0 ? summary.payable : summary.credit, "Net filing position"],
    ["Taxable sales", summary.sales_taxable_base, "Net sales in selected period"],
  ] as const;

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Tax & fiscal controls</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{businessName}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
              Tax reconciliation, filing snapshots, retained-earnings close, controlled reopen, and permanent period locking.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={refresh} disabled={saving !== null}>
            <RefreshCcw className="size-4" aria-hidden="true" /> Refresh
          </Button>
        </header>

        <form onSubmit={applyRange} className="mt-6 grid gap-3 rounded-[var(--radius-card)] bg-surface p-4 shadow-[var(--shadow-sm)] sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Tax period starts</span><Input type="date" value={start} onChange={(event) => setStart(event.target.value)} /></label>
          <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Tax period ends</span><Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} /></label>
          <Button type="submit">Apply period</Button>
        </form>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map(([label, value, helper]) => (
            <article key={label} className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-text-tertiary">{label}</p>
              <strong className="mt-2 block text-xl font-black tabular-nums text-text-primary">{money(value)}</strong>
              <p className="mt-2 text-xs leading-5 text-text-secondary">{helper}</p>
            </article>
          ))}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Tax return</p><h2 className="mt-1 text-xl font-black text-text-primary">Rate reconciliation</h2></div>
              {canManage ? <Button type="button" onClick={prepareFiling} disabled={saving !== null}><FileCheck2 className="size-4" aria-hidden="true" />{saving === "filing" ? "Preparing…" : "Prepare filing"}</Button> : null}
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-text-tertiary"><tr><th className="pb-3 font-black">Source</th><th className="pb-3 font-black">Rate</th><th className="pb-3 text-right font-black">Taxable base</th><th className="pb-3 text-right font-black">Tax</th></tr></thead>
                <tbody>
                  {(tax.rate_breakdown ?? []).map((row, index) => <tr key={`${row.source_kind}-${row.rate}-${index}`} className="border-t border-border/60"><td className="py-3 font-bold text-text-primary">{title(row.source_kind)}</td><td className="py-3 text-text-secondary">{amount(row.rate).toLocaleString()}%</td><td className="py-3 text-right tabular-nums text-text-secondary">{money(row.taxable_base)}</td><td className="py-3 text-right font-black tabular-nums text-text-primary">{money(row.tax_base)}</td></tr>)}
                  {(tax.rate_breakdown ?? []).length === 0 ? <tr><td colSpan={4} className="py-8 text-center text-text-secondary">No posted taxable documents in this period.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><Calculator className="size-5" aria-hidden="true" /></span><div><h2 className="font-black text-text-primary">Tax calculator</h2><p className="mt-1 text-sm text-text-secondary">Check inclusive or exclusive amounts.</p></div></div>
            <form onSubmit={calculateTax} className="mt-5 space-y-4">
              <select className="field-input min-h-11 w-full" value={calculatorForm.codeId} onChange={(event) => setCalculatorForm((current) => ({ ...current, codeId: event.target.value }))}><option value="">Select tax code</option>{codes.filter((code) => code.is_active).map((code) => <option key={code.id} value={code.id}>{code.code} · {code.name} ({amount(code.rate)}%)</option>)}</select>
              <Input inputMode="decimal" value={calculatorForm.value} onChange={(event) => setCalculatorForm((current) => ({ ...current, value: event.target.value }))} placeholder="Amount" />
              <label className="flex items-center gap-3 text-sm font-bold text-text-primary"><input type="checkbox" checked={calculatorForm.inclusive} onChange={(event) => setCalculatorForm((current) => ({ ...current, inclusive: event.target.checked }))} className="size-4 accent-[var(--primary)]" />Amount includes tax</label>
              <Button type="submit" className="w-full" disabled={saving !== null}>{saving === "calculator" ? "Calculating…" : "Calculate"}</Button>
            </form>
            {calculatorResult ? <div className="mt-5 grid gap-2 rounded-[var(--radius-button)] bg-surface-secondary p-4 text-sm"><span className="flex justify-between gap-3 text-text-secondary">Taxable <strong className="text-text-primary">{money(calculatorResult.taxable_amount)}</strong></span><span className="flex justify-between gap-3 text-text-secondary">Tax <strong className="text-text-primary">{money(calculatorResult.tax_amount)}</strong></span><span className="flex justify-between gap-3 text-text-secondary">Total <strong className="text-primary">{money(calculatorResult.total_amount)}</strong></span></div> : null}
          </section>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3"><BadgePercent className="mt-0.5 size-5 text-primary" aria-hidden="true" /><div><h2 className="text-lg font-black text-text-primary">Tax configuration</h2><p className="mt-1 text-sm text-text-secondary">Company registration and default tax behavior.</p></div></div>
            <form onSubmit={saveSettings} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 sm:col-span-2"><span className="text-sm font-bold text-text-primary">Registration number</span><Input value={settings.registration} onChange={(event) => setSettings((current) => ({ ...current, registration: event.target.value }))} disabled={!canManage || saving !== null} /></label>
              <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Filing frequency</span><select className="field-input min-h-11 w-full" value={settings.frequency} onChange={(event) => setSettings((current) => ({ ...current, frequency: event.target.value }))} disabled={!canManage || saving !== null}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option></select></label>
              <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Rounding</span><select className="field-input min-h-11 w-full" value={settings.rounding} onChange={(event) => setSettings((current) => ({ ...current, rounding: event.target.value }))} disabled={!canManage || saving !== null}><option value="per_line">Per line</option><option value="per_document">Per document</option></select></label>
              <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Default sales code</span><select className="field-input min-h-11 w-full" value={settings.defaultSales} onChange={(event) => setSettings((current) => ({ ...current, defaultSales: event.target.value }))} disabled={!canManage || saving !== null}><option value="">Not selected</option>{codes.filter((code) => code.is_active && ["sales", "both"].includes(code.applicability)).map((code) => <option key={code.id} value={code.id}>{code.code} · {amount(code.rate)}%</option>)}</select></label>
              <label className="space-y-2"><span className="text-sm font-bold text-text-primary">Default purchase code</span><select className="field-input min-h-11 w-full" value={settings.defaultPurchase} onChange={(event) => setSettings((current) => ({ ...current, defaultPurchase: event.target.value }))} disabled={!canManage || saving !== null}><option value="">Not selected</option>{codes.filter((code) => code.is_active && ["purchases", "both"].includes(code.applicability)).map((code) => <option key={code.id} value={code.id}>{code.code} · {amount(code.rate)}%</option>)}</select></label>
              <label className="flex items-center gap-3 text-sm font-bold text-text-primary"><input type="checkbox" checked={settings.taxEnabled} onChange={(event) => setSettings((current) => ({ ...current, taxEnabled: event.target.checked }))} disabled={!canManage || saving !== null} className="size-4 accent-[var(--primary)]" />Tax registered</label>
              <label className="flex items-center gap-3 text-sm font-bold text-text-primary"><input type="checkbox" checked={settings.inclusive} onChange={(event) => setSettings((current) => ({ ...current, inclusive: event.target.checked }))} disabled={!canManage || saving !== null} className="size-4 accent-[var(--primary)]" />Prices include tax</label>
              {canManage ? <Button type="submit" className="sm:col-span-2" disabled={saving !== null}><Save className="size-4" aria-hidden="true" />{saving === "settings" ? "Saving…" : "Save tax settings"}</Button> : null}
            </form>
          </section>

          <section className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)] sm:p-6">
            <div className="flex items-start gap-3"><Plus className="mt-0.5 size-5 text-primary" aria-hidden="true" /><div><h2 className="text-lg font-black text-text-primary">Create tax code</h2><p className="mt-1 text-sm text-text-secondary">Used rates stay historically immutable.</p></div></div>
            <form onSubmit={createTaxCode} className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input value={codeForm.code} onChange={(event) => setCodeForm((current) => ({ ...current, code: event.target.value }))} placeholder="Code, e.g. GST18" disabled={!canManage || saving !== null} />
              <Input value={codeForm.name} onChange={(event) => setCodeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" disabled={!canManage || saving !== null} />
              <select className="field-input min-h-11 w-full" value={codeForm.treatment} onChange={(event) => setCodeForm((current) => ({ ...current, treatment: event.target.value, rate: event.target.value === "standard" ? current.rate : "0" }))} disabled={!canManage || saving !== null}><option value="standard">Standard</option><option value="zero_rated">Zero-rated</option><option value="exempt">Exempt</option><option value="out_of_scope">Out of scope</option></select>
              <select className="field-input min-h-11 w-full" value={codeForm.applicability} onChange={(event) => setCodeForm((current) => ({ ...current, applicability: event.target.value }))} disabled={!canManage || saving !== null}><option value="both">Sales & purchases</option><option value="sales">Sales only</option><option value="purchases">Purchases only</option></select>
              <Input inputMode="decimal" value={codeForm.rate} onChange={(event) => setCodeForm((current) => ({ ...current, rate: event.target.value }))} placeholder="Rate %" disabled={!canManage || saving !== null || codeForm.treatment !== "standard"} />
              <Input inputMode="decimal" value={codeForm.recoverable} onChange={(event) => setCodeForm((current) => ({ ...current, recoverable: event.target.value }))} placeholder="Recoverable %" disabled={!canManage || saving !== null} />
              {canManage ? <Button type="submit" className="sm:col-span-2" disabled={saving !== null}>{saving === "code" ? "Creating…" : "Create tax code"}</Button> : null}
            </form>
          </section>
        </div>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Tax filing history</p><h2 className="mt-1 text-xl font-black text-text-primary">Prepared returns</h2></div><span className="text-sm font-black text-text-secondary">{filings.length}</span></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {filings.map((filing) => <article key={filing.id} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)]"><div className="flex items-start justify-between gap-3"><div><strong className="text-text-primary">{formatDate(filing.period_start)} – {formatDate(filing.period_end)}</strong><p className="mt-1 text-sm text-text-secondary">Net {money(filing.net_tax_base)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${filing.status === "paid" ? "bg-success-soft text-success" : filing.status === "filed" ? "bg-info-soft text-info" : filing.status === "void" ? "bg-danger-soft text-danger" : "bg-warning-soft text-warning"}`}>{title(filing.status)}</span></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><span className="rounded-[var(--radius-button)] bg-surface-secondary p-3 text-text-secondary">Output<strong className="mt-1 block text-text-primary">{money(filing.output_tax_base)}</strong></span><span className="rounded-[var(--radius-button)] bg-surface-secondary p-3 text-text-secondary">Input<strong className="mt-1 block text-text-primary">{money(filing.input_tax_base)}</strong></span></div>{canManage && filing.status === "draft" ? <div className="mt-4 flex gap-2"><Button size="sm" onClick={() => changeFilingStatus(filing.id, "filed")} disabled={saving !== null}>Mark filed</Button><Button size="sm" variant="ghost" onClick={() => changeFilingStatus(filing.id, "void")} disabled={saving !== null}>Void</Button></div> : null}{canManage && filing.status === "filed" ? <div className="mt-4 flex gap-2"><Button size="sm" onClick={() => changeFilingStatus(filing.id, "paid")} disabled={saving !== null}>Mark paid</Button><Button size="sm" variant="ghost" onClick={() => changeFilingStatus(filing.id, "void")} disabled={saving !== null}>Void</Button></div> : null}</article>)}
            {filings.length === 0 ? <div className="rounded-[var(--radius-card)] bg-surface p-8 text-center text-sm text-text-secondary shadow-[var(--shadow-sm)] lg:col-span-2">No filing snapshots have been prepared.</div> : null}
          </div>
        </section>

        <section className="mt-8 pb-8">
          <div><p className="text-xs font-black uppercase tracking-[0.12em] text-primary">Period close</p><h2 className="mt-1 text-xl font-black text-text-primary">Fiscal periods</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">Close transfers profit or loss to retained earnings. Reopen creates an exact reversal. Lock is permanent.</p></div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {periods.map((period) => {
              const action = period.status === "open" ? "close" : period.status === "closed" ? "lock" : null;
              const confirmKey = action ? `${period.id}:${action}` : null;
              return <article key={period.id} className="rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)]"><div className="flex items-start justify-between gap-3"><div><strong className="text-base font-black text-text-primary">{period.name}</strong><p className="mt-1 text-sm text-text-secondary">{formatDate(period.starts_on)} – {formatDate(period.ends_on)}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-black ${period.status === "open" ? "bg-success-soft text-success" : period.status === "closed" ? "bg-warning-soft text-warning" : "bg-surface-secondary text-text-secondary"}`}>{title(period.status)}</span></div>{period.closing_net_income_base !== null && period.closing_net_income_base !== undefined ? <p className="mt-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3 text-sm text-text-secondary">Closing profit / loss <strong className="ml-2 text-text-primary">{money(period.closing_net_income_base)}</strong></p> : null}{canManage ? <div className="mt-4 flex flex-wrap gap-2">{action ? <Button size="sm" variant={pendingPeriodAction === confirmKey ? "destructive" : "default"} onClick={() => runPeriodAction(period, action)} disabled={saving !== null}>{action === "close" ? <CalendarCheck2 className="size-4" aria-hidden="true" /> : <LockKeyhole className="size-4" aria-hidden="true" />}{pendingPeriodAction === confirmKey ? `Confirm ${action}` : title(action)}</Button> : null}{period.status === "closed" ? <Button size="sm" variant={pendingPeriodAction === `${period.id}:reopen` ? "destructive" : "outline"} onClick={() => runPeriodAction(period, "reopen")} disabled={saving !== null}><RotateCcw className="size-4" aria-hidden="true" />{pendingPeriodAction === `${period.id}:reopen` ? "Confirm reopen" : "Reopen"}</Button> : null}{period.status === "locked" ? <span className="inline-flex items-center gap-2 text-sm font-bold text-text-secondary"><ShieldCheck className="size-4" aria-hidden="true" />Permanently locked</span> : null}</div> : null}</article>;
            })}
          </div>
          {runs.length > 0 ? <div className="mt-6 rounded-[var(--radius-card)] bg-surface p-5 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2"><CheckCircle2 className="size-5 text-success" aria-hidden="true" /><h3 className="font-black text-text-primary">Closing audit trail</h3></div><div className="mt-4 divide-y divide-border/60">{runs.slice(0, 12).map((run) => <div key={run.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"><div><strong className="text-sm text-text-primary">{title(run.action)}</strong><p className="mt-0.5 text-xs text-text-secondary">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(run.performed_at))}</p></div><span className="text-sm font-black tabular-nums text-text-primary">{run.net_income_base === null || run.net_income_base === undefined ? "—" : money(run.net_income_base)}</span></div>)}</div></div> : null}
        </section>
      </div>
    </main>
  );
}
