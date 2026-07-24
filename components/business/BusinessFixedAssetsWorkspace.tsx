"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Ban,
  BookOpenCheck,
  Calculator,
  CircleDollarSign,
  Factory,
  FileClock,
  Landmark,
  Plus,
  ReceiptText,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  TrendingDown,
  Wrench,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import type {
  AssetAccount,
  BusinessAssetsSnapshot,
  DepreciationConvention,
  DepreciationRun,
  FixedAsset,
} from "@/components/business/fixed-assets/types";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export type { BusinessAssetsSnapshot } from "@/components/business/fixed-assets/types";

type Props = {
  businessId: string;
  businessName: string;
  baseCurrency: string;
  today: string;
  snapshot: BusinessAssetsSnapshot;
};

type Editor = "asset" | "category" | "run" | "capitalization" | "disposal" | null;

const inputClass =
  "finance-focus min-h-11 w-full rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary";
const labelClass = "text-xs font-black text-text-secondary";

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function monthEnd(value: string) {
  const [year, month] = value.slice(0, 7).split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

function formatAmount(value: number | null | undefined, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`));
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

function assetStatusClasses(status: FixedAsset["status"]) {
  if (status === "active" || status === "fully_depreciated") return "bg-success-soft text-success";
  if (status === "disposed" || status === "written_off") return "bg-primary-soft text-primary";
  if (status === "cancelled") return "bg-danger-soft text-danger";
  return "bg-warning-soft text-warning";
}

function runStatusClasses(status: DepreciationRun["status"]) {
  if (status === "posted") return "bg-success-soft text-success";
  if (status === "cancelled") return "bg-danger-soft text-danger";
  return "bg-warning-soft text-warning";
}

function accountLabel(account: AssetAccount) {
  return `${account.code} · ${account.name}`;
}

export default function BusinessFixedAssetsWorkspace({
  businessId,
  businessName,
  baseCurrency,
  today,
  snapshot,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [editor, setEditor] = useState<Editor>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState(snapshot.assets[0]?.id ?? "");
  const [selectedRunId, setSelectedRunId] = useState(snapshot.runs[0]?.id ?? "");

  const defaultCategory = snapshot.categories.find((category) => category.active) ?? snapshot.categories[0];
  const assetAccounts = snapshot.asset_accounts.filter(
    (account) => account.account_type === "asset" && account.normal_balance === "debit" && account.account_subtype !== "contra_asset",
  );
  const accumulatedAccounts = snapshot.asset_accounts.filter(
    (account) => account.account_type === "asset" && account.account_subtype === "contra_asset" && account.normal_balance === "credit",
  );
  const expenseAccounts = snapshot.asset_accounts.filter((account) => account.account_type === "expense");
  const defaultCounterAccount =
    snapshot.counter_accounts.find((account) => account.system_key === "cash") ?? snapshot.counter_accounts[0];

  const [assetDraft, setAssetDraft] = useState({
    categoryId: defaultCategory?.id ?? "",
    branchId: "",
    code: "",
    name: "",
    description: "",
    serialNumber: "",
    location: "",
    acquisitionDate: today,
    inServiceDate: today,
    originalCost: "",
    residualValue: "0",
    usefulLifeMonths: String(defaultCategory?.default_useful_life_months ?? 60),
    convention: (defaultCategory?.default_depreciation_convention ?? "full_month") as DepreciationConvention,
  });

  const [categoryDraft, setCategoryDraft] = useState({
    code: "",
    name: "",
    description: "",
    assetAccountId: assetAccounts[0]?.id ?? "",
    accumulatedAccountId: accumulatedAccounts[0]?.id ?? "",
    expenseAccountId: expenseAccounts.find((account) => account.system_key === "depreciation_expense")?.id ?? expenseAccounts[0]?.id ?? "",
    usefulLifeMonths: "60",
    residualRate: "0",
    convention: "full_month" as DepreciationConvention,
  });

  const [runDraft, setRunDraft] = useState({
    periodStart: monthStart(today),
    postingDate: monthEnd(today),
    branchId: "",
    notes: "",
  });

  const [capitalizationDraft, setCapitalizationDraft] = useState({
    assetId: snapshot.assets.find((asset) => asset.status === "draft")?.id ?? "",
    counterAccountId: defaultCounterAccount?.id ?? "",
    postingDate: today,
    reference: "",
  });

  const [disposalDraft, setDisposalDraft] = useState({
    assetId: snapshot.assets.find((asset) => asset.status === "active" || asset.status === "fully_depreciated")?.id ?? "",
    disposalDate: today,
    proceeds: "",
    disposalAccountId: snapshot.disposal_accounts.find((account) => account.system_key === "cash")?.id ?? snapshot.disposal_accounts[0]?.id ?? "",
    reference: "",
    writeOff: false,
  });

  const selectedAsset = snapshot.assets.find((asset) => asset.id === selectedAssetId) ?? snapshot.assets[0];
  const selectedRun = snapshot.runs.find((run) => run.id === selectedRunId) ?? snapshot.runs[0];
  const selectedRunLines = selectedRun
    ? snapshot.lines.filter((line) => line.depreciation_run_id === selectedRun.id)
    : [];

  function refresh(message: string) {
    toast.success(message);
    setEditor(null);
    router.refresh();
  }

  async function runRpc(key: string, rpc: string, args: Record<string, unknown>, success: string) {
    if (busyKey) return;
    setBusyKey(key);
    const { error } = await supabase.rpc(rpc, args);
    setBusyKey(null);
    if (error) {
      console.error(`${rpc} failed`, { code: error.code });
      toast.error(error.message || "Fixed asset action could not be completed.");
      return;
    }
    refresh(success);
  }

  async function saveAsset() {
    await runRpc(
      "asset-save",
      "upsert_business_fixed_asset",
      {
        p_business_id: businessId,
        p_asset_id: null,
        p_category_id: assetDraft.categoryId,
        p_branch_id: assetDraft.branchId || null,
        p_asset_code: assetDraft.code,
        p_name: assetDraft.name,
        p_description: assetDraft.description || null,
        p_serial_number: assetDraft.serialNumber || null,
        p_location: assetDraft.location || null,
        p_acquisition_date: assetDraft.acquisitionDate,
        p_in_service_date: assetDraft.inServiceDate,
        p_original_cost: Number(assetDraft.originalCost),
        p_residual_value: Number(assetDraft.residualValue || 0),
        p_useful_life_months: Number(assetDraft.usefulLifeMonths),
        p_depreciation_convention: assetDraft.convention,
      },
      "Draft fixed asset added. Capitalize it only after reviewing cost and account selection.",
    );
  }

  async function saveCategory() {
    await runRpc(
      "category-save",
      "upsert_business_asset_category",
      {
        p_business_id: businessId,
        p_category_id: null,
        p_code: categoryDraft.code,
        p_name: categoryDraft.name,
        p_description: categoryDraft.description || null,
        p_asset_account_id: categoryDraft.assetAccountId,
        p_accumulated_depreciation_account_id: categoryDraft.accumulatedAccountId,
        p_depreciation_expense_account_id: categoryDraft.expenseAccountId,
        p_default_useful_life_months: Number(categoryDraft.usefulLifeMonths),
        p_default_residual_rate: Number(categoryDraft.residualRate || 0),
        p_default_depreciation_convention: categoryDraft.convention,
        p_active: true,
      },
      "Asset category created with protected financial accounts.",
    );
  }

  async function createRun() {
    await runRpc(
      "run-create",
      "create_business_asset_depreciation_run",
      {
        p_business_id: businessId,
        p_period_start: runDraft.periodStart,
        p_posting_date: runDraft.postingDate,
        p_branch_id: runDraft.branchId || null,
        p_notes: runDraft.notes || null,
      },
      "Draft monthly depreciation run created.",
    );
  }

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                <Factory aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Fixed assets & depreciation</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{businessName}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  Register capital assets, post their acquisition, run sequential monthly straight-line depreciation, and record disposal or write-off through the same immutable accounting ledger.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
              <ShieldCheck aria-hidden="true" className="size-4" /> Branch & journal controls active
            </span>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Active assets" value={String(snapshot.summary.active_assets)} icon={<Factory />} />
          <SummaryCard label="Original cost" value={formatAmount(snapshot.summary.original_cost, baseCurrency)} icon={<CircleDollarSign />} />
          <SummaryCard label="Accumulated depreciation" value={formatAmount(snapshot.summary.accumulated_depreciation, baseCurrency)} icon={<TrendingDown />} />
          <SummaryCard label="Net book value" value={formatAmount(snapshot.summary.net_book_value, baseCurrency)} icon={<BookOpenCheck />} />
          <SummaryCard label="Draft work" value={`${snapshot.summary.draft_assets} assets · ${snapshot.summary.draft_runs} runs`} icon={<FileClock />} />
        </section>

        <section className="rounded-[var(--radius-card)] bg-primary-soft px-5 py-5 text-primary shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-start gap-3">
            <Calculator aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-black">Depreciation policy for this release</h2>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Monthly straight-line only. Full-month starts in the service month; next-month starts one month later. Runs must follow each asset’s next expected month. This module does not invent statutory tax rates or country-specific tax depreciation formulas.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-5">
            <Panel title="Create & configure" icon={<Wrench />}>
              <div className="grid gap-2 sm:grid-cols-2">
                {snapshot.capabilities.can_manage ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setEditor(editor === "asset" ? null : "asset")}>
                      <Plus aria-hidden="true" /> New asset
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditor(editor === "category" ? null : "category")}>
                      <Plus aria-hidden="true" /> New category
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setEditor(editor === "capitalization" ? null : "capitalization")}>
                      <BadgeCheck aria-hidden="true" /> Capitalize draft
                    </Button>
                  </>
                ) : null}
                {snapshot.capabilities.can_depreciate ? (
                  <Button type="button" variant="outline" onClick={() => setEditor(editor === "run" ? null : "run")}>
                    <Calculator aria-hidden="true" /> Monthly run
                  </Button>
                ) : null}
                {snapshot.capabilities.can_dispose ? (
                  <Button type="button" variant="outline" onClick={() => setEditor(editor === "disposal" ? null : "disposal")}>
                    <Trash2 aria-hidden="true" /> Dispose / write off
                  </Button>
                ) : null}
              </div>

              {editor === "asset" ? (
                <FormCard title="Draft fixed asset" onClose={() => setEditor(null)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Asset code"><input className={inputClass} value={assetDraft.code} onChange={(event) => setAssetDraft({ ...assetDraft, code: event.target.value.toUpperCase() })} placeholder="LAPTOP01" /></Field>
                    <Field label="Asset name"><input className={inputClass} value={assetDraft.name} onChange={(event) => setAssetDraft({ ...assetDraft, name: event.target.value })} placeholder="Operations laptop" /></Field>
                    <Field label="Category"><select className={inputClass} value={assetDraft.categoryId} onChange={(event) => { const category = snapshot.categories.find((item) => item.id === event.target.value); setAssetDraft({ ...assetDraft, categoryId: event.target.value, usefulLifeMonths: String(category?.default_useful_life_months ?? assetDraft.usefulLifeMonths), convention: category?.default_depreciation_convention ?? assetDraft.convention }); }}>{snapshot.categories.filter((category) => category.active).map((category) => <option key={category.id} value={category.id}>{category.code} · {category.name}</option>)}</select></Field>
                    <Field label="Branch"><select className={inputClass} value={assetDraft.branchId} onChange={(event) => setAssetDraft({ ...assetDraft, branchId: event.target.value })}><option value="">Company-wide</option>{snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></Field>
                    <Field label="Acquisition date"><input type="date" className={inputClass} value={assetDraft.acquisitionDate} onChange={(event) => setAssetDraft({ ...assetDraft, acquisitionDate: event.target.value })} /></Field>
                    <Field label="In-service date"><input type="date" className={inputClass} value={assetDraft.inServiceDate} onChange={(event) => setAssetDraft({ ...assetDraft, inServiceDate: event.target.value })} /></Field>
                    <Field label={`Original cost (${baseCurrency})`}><input type="number" min="0" step="0.01" className={inputClass} value={assetDraft.originalCost} onChange={(event) => setAssetDraft({ ...assetDraft, originalCost: event.target.value })} /></Field>
                    <Field label={`Residual value (${baseCurrency})`}><input type="number" min="0" step="0.01" className={inputClass} value={assetDraft.residualValue} onChange={(event) => setAssetDraft({ ...assetDraft, residualValue: event.target.value })} /></Field>
                    <Field label="Useful life (months)"><input type="number" min="1" max="1200" className={inputClass} value={assetDraft.usefulLifeMonths} onChange={(event) => setAssetDraft({ ...assetDraft, usefulLifeMonths: event.target.value })} /></Field>
                    <Field label="Convention"><select className={inputClass} value={assetDraft.convention} onChange={(event) => setAssetDraft({ ...assetDraft, convention: event.target.value as DepreciationConvention })}><option value="full_month">Full month</option><option value="next_month">Start next month</option></select></Field>
                    <Field label="Serial number"><input className={inputClass} value={assetDraft.serialNumber} onChange={(event) => setAssetDraft({ ...assetDraft, serialNumber: event.target.value })} /></Field>
                    <Field label="Location"><input className={inputClass} value={assetDraft.location} onChange={(event) => setAssetDraft({ ...assetDraft, location: event.target.value })} /></Field>
                  </div>
                  <Field label="Description"><textarea className={`${inputClass} min-h-24 py-3`} value={assetDraft.description} onChange={(event) => setAssetDraft({ ...assetDraft, description: event.target.value })} /></Field>
                  <Button loading={busyKey === "asset-save"} loadingLabel="Saving…" onClick={() => void saveAsset()}><Save aria-hidden="true" /> Save draft asset</Button>
                </FormCard>
              ) : null}

              {editor === "category" ? (
                <FormCard title="Asset category" onClose={() => setEditor(null)}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Category code"><input className={inputClass} value={categoryDraft.code} onChange={(event) => setCategoryDraft({ ...categoryDraft, code: event.target.value.toUpperCase() })} placeholder="VEHICLES" /></Field>
                    <Field label="Category name"><input className={inputClass} value={categoryDraft.name} onChange={(event) => setCategoryDraft({ ...categoryDraft, name: event.target.value })} placeholder="Vehicles" /></Field>
                    <Field label="Asset account"><select className={inputClass} value={categoryDraft.assetAccountId} onChange={(event) => setCategoryDraft({ ...categoryDraft, assetAccountId: event.target.value })}>{assetAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select></Field>
                    <Field label="Accumulated depreciation"><select className={inputClass} value={categoryDraft.accumulatedAccountId} onChange={(event) => setCategoryDraft({ ...categoryDraft, accumulatedAccountId: event.target.value })}>{accumulatedAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select></Field>
                    <Field label="Depreciation expense"><select className={inputClass} value={categoryDraft.expenseAccountId} onChange={(event) => setCategoryDraft({ ...categoryDraft, expenseAccountId: event.target.value })}>{expenseAccounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select></Field>
                    <Field label="Default life (months)"><input type="number" min="1" max="1200" className={inputClass} value={categoryDraft.usefulLifeMonths} onChange={(event) => setCategoryDraft({ ...categoryDraft, usefulLifeMonths: event.target.value })} /></Field>
                    <Field label="Default residual rate %"><input type="number" min="0" max="100" step="0.01" className={inputClass} value={categoryDraft.residualRate} onChange={(event) => setCategoryDraft({ ...categoryDraft, residualRate: event.target.value })} /></Field>
                    <Field label="Convention"><select className={inputClass} value={categoryDraft.convention} onChange={(event) => setCategoryDraft({ ...categoryDraft, convention: event.target.value as DepreciationConvention })}><option value="full_month">Full month</option><option value="next_month">Start next month</option></select></Field>
                  </div>
                  <Field label="Description"><textarea className={`${inputClass} min-h-20 py-3`} value={categoryDraft.description} onChange={(event) => setCategoryDraft({ ...categoryDraft, description: event.target.value })} /></Field>
                  <p className="text-xs leading-5 text-text-secondary">Financial accounts become locked after any asset in this category is capitalized.</p>
                  <Button loading={busyKey === "category-save"} loadingLabel="Saving…" onClick={() => void saveCategory()}><Save aria-hidden="true" /> Save category</Button>
                </FormCard>
              ) : null}

              {editor === "capitalization" ? (
                <FormCard title="Capitalize draft asset" onClose={() => setEditor(null)}>
                  <Field label="Draft asset"><select className={inputClass} value={capitalizationDraft.assetId} onChange={(event) => setCapitalizationDraft({ ...capitalizationDraft, assetId: event.target.value })}><option value="">Select asset</option>{snapshot.assets.filter((asset) => asset.status === "draft").map((asset) => <option key={asset.id} value={asset.id}>{asset.asset_code} · {asset.name} · {formatAmount(asset.original_cost, baseCurrency)}</option>)}</select></Field>
                  <Field label="Counter account"><select className={inputClass} value={capitalizationDraft.counterAccountId} onChange={(event) => setCapitalizationDraft({ ...capitalizationDraft, counterAccountId: event.target.value })}>{snapshot.counter_accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select></Field>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="Posting date"><input type="date" className={inputClass} value={capitalizationDraft.postingDate} onChange={(event) => setCapitalizationDraft({ ...capitalizationDraft, postingDate: event.target.value })} /></Field><Field label="Reference"><input className={inputClass} value={capitalizationDraft.reference} onChange={(event) => setCapitalizationDraft({ ...capitalizationDraft, reference: event.target.value })} /></Field></div>
                  <p className="text-xs leading-5 text-text-secondary">Posts Dr fixed asset / Cr selected counter account. The posted journal is immutable.</p>
                  <Button loading={busyKey === "asset-capitalize"} loadingLabel="Posting…" onClick={() => void runRpc("asset-capitalize", "activate_business_fixed_asset", { p_business_id: businessId, p_asset_id: capitalizationDraft.assetId, p_counter_account_id: capitalizationDraft.counterAccountId, p_posting_date: capitalizationDraft.postingDate, p_reference: capitalizationDraft.reference || null }, "Asset capitalized and balanced journal posted.")}><BadgeCheck aria-hidden="true" /> Capitalize & post</Button>
                </FormCard>
              ) : null}

              {editor === "run" ? (
                <FormCard title="Monthly depreciation run" onClose={() => setEditor(null)}>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="Month"><input type="month" className={inputClass} value={runDraft.periodStart.slice(0, 7)} onChange={(event) => setRunDraft({ ...runDraft, periodStart: `${event.target.value}-01`, postingDate: monthEnd(`${event.target.value}-01`) })} /></Field><Field label="Posting date"><input type="date" className={inputClass} value={runDraft.postingDate} onChange={(event) => setRunDraft({ ...runDraft, postingDate: event.target.value })} /></Field></div>
                  <Field label="Branch"><select className={inputClass} value={runDraft.branchId} onChange={(event) => setRunDraft({ ...runDraft, branchId: event.target.value })}><option value="">Company-wide</option>{snapshot.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select></Field>
                  <Field label="Notes"><textarea className={`${inputClass} min-h-20 py-3`} value={runDraft.notes} onChange={(event) => setRunDraft({ ...runDraft, notes: event.target.value })} /></Field>
                  <Button loading={busyKey === "run-create"} loadingLabel="Creating…" onClick={() => void createRun()}><Plus aria-hidden="true" /> Create draft run</Button>
                </FormCard>
              ) : null}

              {editor === "disposal" ? (
                <FormCard title="Dispose or write off" onClose={() => setEditor(null)}>
                  <Field label="Asset"><select className={inputClass} value={disposalDraft.assetId} onChange={(event) => setDisposalDraft({ ...disposalDraft, assetId: event.target.value })}><option value="">Select asset</option>{snapshot.assets.filter((asset) => asset.status === "active" || asset.status === "fully_depreciated").map((asset) => <option key={asset.id} value={asset.id}>{asset.asset_code} · {asset.name} · NBV {formatAmount(asset.book_value, baseCurrency)}</option>)}</select></Field>
                  <div className="grid gap-4 sm:grid-cols-2"><Field label="Disposal date"><input type="date" className={inputClass} value={disposalDraft.disposalDate} onChange={(event) => setDisposalDraft({ ...disposalDraft, disposalDate: event.target.value })} /></Field><Field label={`Proceeds (${baseCurrency})`}><input type="number" min="0" step="0.01" className={inputClass} disabled={disposalDraft.writeOff} value={disposalDraft.writeOff ? "0" : disposalDraft.proceeds} onChange={(event) => setDisposalDraft({ ...disposalDraft, proceeds: event.target.value })} /></Field></div>
                  {!disposalDraft.writeOff ? <Field label="Proceeds account"><select className={inputClass} value={disposalDraft.disposalAccountId} onChange={(event) => setDisposalDraft({ ...disposalDraft, disposalAccountId: event.target.value })}>{snapshot.disposal_accounts.map((account) => <option key={account.id} value={account.id}>{accountLabel(account)}</option>)}</select></Field> : null}
                  <Field label="Reference"><input className={inputClass} value={disposalDraft.reference} onChange={(event) => setDisposalDraft({ ...disposalDraft, reference: event.target.value })} /></Field>
                  <label className="flex items-center gap-2 text-sm font-bold text-text-primary"><input type="checkbox" className="size-4 accent-current" checked={disposalDraft.writeOff} onChange={(event) => setDisposalDraft({ ...disposalDraft, writeOff: event.target.checked, proceeds: event.target.checked ? "0" : disposalDraft.proceeds })} /> Write off with zero proceeds</label>
                  <p className="text-xs leading-5 text-text-secondary">Disposal removes asset cost and accumulated depreciation, then posts gain or loss automatically. This action cannot be undone through direct edits.</p>
                  <Button variant="destructive" loading={busyKey === "asset-dispose"} loadingLabel="Posting…" onClick={() => void runRpc("asset-dispose", "dispose_business_fixed_asset", { p_business_id: businessId, p_asset_id: disposalDraft.assetId, p_disposal_date: disposalDraft.disposalDate, p_proceeds: disposalDraft.writeOff ? 0 : Number(disposalDraft.proceeds || 0), p_disposal_account_id: disposalDraft.writeOff ? null : disposalDraft.disposalAccountId, p_reference: disposalDraft.reference || null, p_write_off: disposalDraft.writeOff }, disposalDraft.writeOff ? "Asset written off and journal posted." : "Asset disposed and gain/loss journal posted.")}><Trash2 aria-hidden="true" /> {disposalDraft.writeOff ? "Write off asset" : "Dispose asset"}</Button>
                </FormCard>
              ) : null}
            </Panel>

            <Panel title="Categories" icon={<Landmark />}>
              <div className="space-y-3">
                {snapshot.categories.map((category) => (
                  <article key={category.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                    <div className="flex items-start justify-between gap-3"><div><strong className="text-sm text-text-primary">{category.code} · {category.name}</strong><p className="mt-1 text-xs text-text-secondary">{category.default_useful_life_months} months · {formatLabel(category.default_depreciation_convention)}</p></div><span className={`rounded-full px-2 py-1 text-[11px] font-black ${category.active ? "bg-success-soft text-success" : "bg-surface text-text-secondary"}`}>{category.active ? "Active" : "Inactive"}</span></div>
                    <div className="mt-3 grid gap-2 text-xs text-text-secondary"><span>Asset: {category.asset_account_code} · {category.asset_account_name}</span><span>Contra: {category.accumulated_account_code} · {category.accumulated_account_name}</span><span>Expense: {category.expense_account_code} · {category.expense_account_name}</span></div>
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Asset register" icon={<Factory />}>
              <div className="space-y-3">
                {snapshot.assets.length ? snapshot.assets.map((asset) => (
                  <button key={asset.id} type="button" onClick={() => setSelectedAssetId(asset.id)} className={`finance-focus w-full rounded-[var(--radius-button)] px-4 py-4 text-left transition-colors ${selectedAsset?.id === asset.id ? "bg-primary-soft" : "bg-surface-secondary hover:bg-surface-tinted"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><strong className="block truncate text-sm text-text-primary">{asset.asset_code} · {asset.name}</strong><span className="mt-1 block text-xs text-text-secondary">{asset.category_name} · {asset.branch_name ?? "Company-wide"}</span></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${assetStatusClasses(asset.status)}`}>{formatLabel(asset.status)}</span></div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><Metric label="Cost" value={formatAmount(asset.original_cost, baseCurrency)} /><Metric label="Accumulated" value={formatAmount(asset.accumulated_depreciation, baseCurrency)} /><Metric label="Book value" value={formatAmount(asset.book_value, baseCurrency)} /><Metric label="Life" value={`${asset.useful_life_months} months`} /></div>
                  </button>
                )) : <EmptyState text="No fixed assets are visible in your branch scope." />}
              </div>

              {selectedAsset ? (
                <div className="mt-5 rounded-[var(--radius-button)] border border-border bg-surface px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-text-primary">{selectedAsset.asset_display_code} · {selectedAsset.name}</h3><p className="mt-1 text-xs text-text-secondary">In service {formatDate(selectedAsset.in_service_date)} · {formatLabel(selectedAsset.depreciation_convention)}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${assetStatusClasses(selectedAsset.status)}`}>{formatLabel(selectedAsset.status)}</span></div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"><Detail label="Serial" value={selectedAsset.serial_number ?? "Not set"} /><Detail label="Location" value={selectedAsset.location ?? "Not set"} /><Detail label="Last depreciation" value={formatDate(selectedAsset.last_depreciation_period_end)} /><Detail label="Capitalization journal" value={selectedAsset.capitalization_journal_number ? `J-${selectedAsset.capitalization_journal_number}` : "Not posted"} /><Detail label="Disposal journal" value={selectedAsset.disposal_journal_number ? `J-${selectedAsset.disposal_journal_number}` : "Not disposed"} /><Detail label="Residual value" value={formatAmount(selectedAsset.residual_value, baseCurrency)} /></div>
                  {selectedAsset.status === "draft" && snapshot.capabilities.can_manage ? <Button className="mt-4" size="sm" variant="destructive" loading={busyKey === `asset-cancel-${selectedAsset.id}`} loadingLabel="Cancelling…" onClick={() => void runRpc(`asset-cancel-${selectedAsset.id}`, "cancel_draft_business_fixed_asset", { p_business_id: businessId, p_asset_id: selectedAsset.id, p_reason: "Cancelled from fixed asset workspace" }, "Draft asset cancelled without a journal.")}><Ban aria-hidden="true" /> Cancel draft</Button> : null}
                </div>
              ) : null}
            </Panel>

            <Panel title="Depreciation runs" icon={<Calculator />}>
              <div className="space-y-3">
                {snapshot.runs.length ? snapshot.runs.map((run) => (
                  <article key={run.id} className={`rounded-[var(--radius-button)] px-4 py-4 ${selectedRun?.id === run.id ? "bg-primary-soft" : "bg-surface-secondary"}`}>
                    <button type="button" onClick={() => setSelectedRunId(run.id)} className="w-full text-left">
                      <div className="flex flex-wrap items-start justify-between gap-3"><div><strong className="text-sm text-text-primary">{run.run_code} · {formatDate(run.period_start)}</strong><p className="mt-1 text-xs text-text-secondary">{run.branch_name ?? "Company-wide"} · Post {formatDate(run.posting_date)}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${runStatusClasses(run.status)}`}>{formatLabel(run.status)}</span></div>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-secondary"><span>{run.asset_count} assets</span><span>{formatAmount(run.total_depreciation, baseCurrency)}</span>{run.journal_number ? <span>Journal J-{run.journal_number}</span> : null}</div>
                    </button>
                    {run.status === "draft" && snapshot.capabilities.can_depreciate ? <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" loading={busyKey === `run-recalc-${run.id}`} loadingLabel="Calculating…" onClick={() => void runRpc(`run-recalc-${run.id}`, "recalculate_business_asset_depreciation_run", { p_business_id: businessId, p_run_id: run.id }, "Eligible assets recalculated for this month.")}><RefreshCw aria-hidden="true" /> Recalculate</Button><Button size="sm" loading={busyKey === `run-post-${run.id}`} loadingLabel="Posting…" onClick={() => void runRpc(`run-post-${run.id}`, "post_business_asset_depreciation_run", { p_business_id: businessId, p_run_id: run.id }, "Depreciation posted to the immutable journal.")}><BadgeCheck aria-hidden="true" /> Post run</Button><Button size="sm" variant="ghost" loading={busyKey === `run-cancel-${run.id}`} loadingLabel="Cancelling…" onClick={() => void runRpc(`run-cancel-${run.id}`, "cancel_business_asset_depreciation_run", { p_business_id: businessId, p_run_id: run.id, p_reason: "Cancelled from fixed asset workspace" }, "Draft depreciation run cancelled.")}><X aria-hidden="true" /> Cancel</Button></div> : null}
                  </article>
                )) : <EmptyState text="No depreciation runs have been created." />}
              </div>

              {selectedRun ? (
                <div className="mt-5 overflow-hidden rounded-[var(--radius-button)] border border-border">
                  <div className="bg-surface-secondary px-4 py-3"><strong className="text-sm text-text-primary">{selectedRun.run_code} calculation lines</strong></div>
                  <div className="divide-y divide-border bg-surface">
                    {selectedRunLines.length ? selectedRunLines.map((line) => <div key={line.id} className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[1.4fr_repeat(3,1fr)]"><strong className="text-text-primary">{line.asset_code} · {line.asset_name}</strong><span className="text-text-secondary">Depreciation {formatAmount(line.depreciation_amount, baseCurrency)}</span><span className="text-text-secondary">Closing accum. {formatAmount(line.closing_accumulated_depreciation, baseCurrency)}</span><span className="text-text-secondary">Closing NBV {formatAmount(line.closing_book_value, baseCurrency)}</span></div>) : <p className="px-4 py-5 text-sm text-text-secondary">Recalculate this draft run to see eligible assets. Zero lines usually means the month is not the next expected depreciation period.</p>}
                  </div>
                </div>
              ) : null}
            </Panel>

            <Panel title="Audit trail" icon={<ReceiptText />}>
              <div className="space-y-2">
                {snapshot.audit.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="flex flex-col gap-1 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-xs text-text-primary">{formatLabel(entry.action)}</strong><p className="mt-0.5 text-xs text-text-secondary">{entry.actor_name}</p></div><time className="text-xs text-text-tertiary">{formatDateTime(entry.created_at)}</time></div>
                ))}
                {!snapshot.audit.length ? <EmptyState text="Asset actions will appear here." /> : null}
              </div>
            </Panel>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return <article className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-2 text-primary"><span className="[&_svg]:size-4">{icon}</span><span className="text-xs font-black uppercase tracking-[0.08em]">{label}</span></div><strong className="mt-3 block truncate text-lg font-black text-text-primary">{value}</strong></article>;
}

function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6"><div className="mb-4 flex items-center gap-3"><span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary [&_svg]:size-5">{icon}</span><h2 className="text-base font-black text-text-primary sm:text-lg">{title}</h2></div>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-1.5"><span className={labelClass}>{label}</span>{children}</label>;
}

function FormCard({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return <div className="mt-4 space-y-4 rounded-[var(--radius-button)] border border-border bg-surface px-4 py-4"><div className="flex items-center justify-between gap-3"><h3 className="font-black text-text-primary">{title}</h3><button type="button" onClick={onClose} className="finance-focus inline-flex size-9 items-center justify-center rounded-[var(--radius-button)] text-text-secondary hover:bg-surface-secondary"><X aria-hidden="true" className="size-4" /></button></div>{children}</div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <span className="rounded-[var(--radius-button)] bg-surface px-2.5 py-2"><span className="block text-[10px] font-bold uppercase tracking-wide text-text-tertiary">{label}</span><strong className="mt-0.5 block truncate text-xs text-text-primary">{value}</strong></span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><span className="text-[11px] font-bold uppercase tracking-wide text-text-tertiary">{label}</span><strong className="mt-1 block text-sm text-text-primary">{value}</strong></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-8 text-center text-sm text-text-secondary">{text}</div>;
}
