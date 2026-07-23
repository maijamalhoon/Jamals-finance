"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownUp,
  BadgeDollarSign,
  BookOpenCheck,
  CalendarClock,
  CircleDollarSign,
  FileClock,
  Landmark,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  AuditRow,
  BankRow,
  Empty,
  ExposureGroup,
  Field,
  Panel,
  RunCard,
  SettlementRow,
  SummaryCard,
  amount,
  inputClass,
  number,
} from "@/components/business/BusinessFxWorkspaceParts";

import type {
  BusinessFxLine,
  BusinessFxRate,
  BusinessFxSnapshot,
} from "@/lib/business-fx";
import { createClient } from "@/lib/supabase/client";

type Props = {
  businessId: string;
  businessName: string;
  baseCurrency: string;
  today: string;
  snapshot: BusinessFxSnapshot;
};

type RateDraft = {
  currency: string;
  rateDate: string;
  rate: string;
  source: "manual" | "import" | "api";
  notes: string;
};

type RunDraft = {
  closingDate: string;
  notes: string;
};

function errorMessage(error: { code?: string; message?: string }) {
  if (error.code === "42501") return "You do not have permission for this FX action.";
  if (error.code === "55000") return error.message ?? "This FX record is locked by accounting controls.";
  if (error.code === "P0002") return error.message ?? "A required exchange rate or accounting source is missing.";
  if (error.code === "22008") return error.message ?? "The selected date is outside the allowed period.";
  if (error.code === "23505") return error.message ?? "This FX record already exists.";
  return error.message ?? "The foreign exchange action could not be completed.";
}

export default function BusinessFxWorkspace({ businessId, businessName, baseCurrency, today, snapshot }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState<RateDraft>({
    currency: snapshot.currencies[0] ?? "USD",
    rateDate: today,
    rate: "",
    source: "manual",
    notes: "",
  });
  const [runDraft, setRunDraft] = useState<RunDraft>({ closingDate: today, notes: "" });
  const [reverseDates, setReverseDates] = useState<Record<string, string>>({});

  async function rpc(name: string, args: Record<string, unknown>, success: string, key: string) {
    if (busy) return false;
    setBusy(key);
    const { error } = await supabase.rpc(name, args);
    setBusy(null);
    if (error) {
      console.error("FX RPC failed", { name, code: error.code });
      toast.error(errorMessage(error));
      return false;
    }
    toast.success(success);
    router.refresh();
    return true;
  }

  async function saveRate() {
    if (rateDraft.currency.trim().length !== 3 || !rateDraft.rateDate || Number(rateDraft.rate) <= 0) {
      toast.error("Enter a three-letter foreign currency, valid date, and positive rate.");
      return;
    }
    const saved = await rpc(
      "upsert_business_fx_rate",
      {
        p_business_id: businessId,
        p_rate_id: null,
        p_currency: rateDraft.currency.trim().toUpperCase(),
        p_rate_date: rateDraft.rateDate,
        p_rate_to_base: Number(rateDraft.rate),
        p_source: rateDraft.source,
        p_notes: rateDraft.notes || null,
      },
      "Exchange rate saved and available to settlements and revaluation.",
      "save-rate",
    );
    if (saved) setRateDraft((current) => ({ ...current, rate: "", notes: "" }));
  }

  async function deleteRate(rate: BusinessFxRate) {
    await rpc(
      "delete_business_fx_rate",
      { p_business_id: businessId, p_rate_id: rate.id },
      "Unused exchange rate deleted.",
      `delete-rate-${rate.id}`,
    );
  }

  async function createRun() {
    if (!runDraft.closingDate) {
      toast.error("Choose a closing date.");
      return;
    }
    const created = await rpc(
      "create_business_fx_revaluation_run",
      { p_business_id: businessId, p_closing_date: runDraft.closingDate, p_notes: runDraft.notes || null },
      "Draft FX revaluation created.",
      "create-run",
    );
    if (created) setRunDraft({ closingDate: today, notes: "" });
  }

  const linesByRun = useMemo(() => {
    const map = new Map<string, BusinessFxLine[]>();
    for (const line of snapshot.lines) map.set(line.revaluation_run_id, [...(map.get(line.revaluation_run_id) ?? []), line]);
    return map;
  }, [snapshot.lines]);

  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)] sm:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
                <ArrowDownUp aria-hidden="true" className="size-6" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Multi-currency & foreign exchange</p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-tight text-text-primary sm:text-3xl">{businessName}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
                  Maintain auditable rates, settle foreign invoices at the payment-date rate, and post reversible period-end revaluation through the immutable accounting ledger.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-success-soft px-3 py-1.5 text-xs font-black text-success">
              <ShieldCheck aria-hidden="true" className="size-4" /> Company-wide accounting scope
            </span>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Rates" value={String(snapshot.summary.rate_count)} icon={<ArrowDownUp />} />
          <SummaryCard label="Foreign receivables" value={String(snapshot.summary.foreign_receivable_count)} icon={<TrendingUp />} />
          <SummaryCard label="Foreign payables" value={String(snapshot.summary.foreign_payable_count)} icon={<TrendingDown />} />
          <SummaryCard label="Foreign banks" value={String(snapshot.summary.foreign_bank_count)} icon={<Landmark />} />
          <SummaryCard label="Realized gain" value={amount(snapshot.summary.realized_gain_base, baseCurrency)} icon={<BadgeDollarSign />} />
          <SummaryCard label="Realized loss" value={amount(snapshot.summary.realized_loss_base, baseCurrency)} icon={<CircleDollarSign />} />
        </section>

        <section className="rounded-[var(--radius-card)] bg-primary-soft px-5 py-5 text-primary shadow-[var(--shadow-sm)] sm:px-6">
          <div className="flex items-start gap-3">
            <BookOpenCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="font-black">Controlled FX policy</h2>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Rates are quoted as one unit of foreign currency in {baseCurrency}. A posted revaluation must be reversed before its invoices or bills can settle. Mixed-currency bank ledgers are excluded rather than estimated, and no market rate is invented automatically.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-5">
            <Panel title="Rate book" icon={<ArrowDownUp />}>
              {snapshot.capabilities.can_manage ? (
                <div className="space-y-4 rounded-[var(--radius-button)] bg-surface-secondary p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Foreign currency">
                      <input className={inputClass} maxLength={3} value={rateDraft.currency} onChange={(event) => setRateDraft({ ...rateDraft, currency: event.target.value.toUpperCase() })} placeholder="USD" />
                    </Field>
                    <Field label="Effective date">
                      <input type="date" max={today} className={inputClass} value={rateDraft.rateDate} onChange={(event) => setRateDraft({ ...rateDraft, rateDate: event.target.value })} />
                    </Field>
                    <Field label={`Rate to ${baseCurrency}`}>
                      <input type="number" min="0" step="0.000001" className={inputClass} value={rateDraft.rate} onChange={(event) => setRateDraft({ ...rateDraft, rate: event.target.value })} placeholder="280.00" />
                    </Field>
                    <Field label="Evidence source">
                      <select className={inputClass} value={rateDraft.source} onChange={(event) => setRateDraft({ ...rateDraft, source: event.target.value as RateDraft["source"] })}>
                        <option value="manual">Manual</option><option value="import">Imported</option><option value="api">API</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Notes / source reference"><input className={inputClass} value={rateDraft.notes} onChange={(event) => setRateDraft({ ...rateDraft, notes: event.target.value })} placeholder="Central bank closing rate" /></Field>
                  <Button type="button" loading={busy === "save-rate"} loadingLabel="Saving…" onClick={() => void saveRate()}><Save aria-hidden="true" /> Save rate</Button>
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                {snapshot.rates.length ? snapshot.rates.map((rate) => (
                  <article key={rate.id} className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-text-primary">1 {rate.currency} = {number(rate.rate_to_base, 10)} {baseCurrency}</strong><span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-black text-text-secondary">{rate.source}</span></div><p className="mt-1 text-xs text-text-secondary">{rate.rate_date}{rate.notes ? ` · ${rate.notes}` : ""}</p></div>
                    {snapshot.capabilities.can_manage ? <Button type="button" size="sm" variant="ghost" loading={busy === `delete-rate-${rate.id}`} loadingLabel="Deleting…" onClick={() => void deleteRate(rate)}><Trash2 aria-hidden="true" /> Delete</Button> : null}
                  </article>
                )) : <Empty text="No foreign exchange rates recorded yet." />}
              </div>
            </Panel>

            <Panel title="Period-end revaluation" icon={<CalendarClock />}>
              {snapshot.capabilities.can_revalue ? (
                <div className="space-y-4 rounded-[var(--radius-button)] bg-surface-secondary p-4">
                  <Field label="Closing date"><input type="date" max={today} className={inputClass} value={runDraft.closingDate} onChange={(event) => setRunDraft({ ...runDraft, closingDate: event.target.value })} /></Field>
                  <Field label="Notes"><input className={inputClass} value={runDraft.notes} onChange={(event) => setRunDraft({ ...runDraft, notes: event.target.value })} placeholder="Month-end close" /></Field>
                  <Button type="button" loading={busy === "create-run"} loadingLabel="Creating…" onClick={() => void createRun()}><Plus aria-hidden="true" /> Create draft run</Button>
                </div>
              ) : null}
              <p className="mt-4 text-xs leading-5 text-text-secondary">Only one posted, unreversed revaluation can exist. Reversal must use a later date in an open fiscal period.</p>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Open foreign exposure" icon={<WalletCards />}><ExposureGroup title="Customer receivables" items={snapshot.receivables} baseCurrency={baseCurrency} /><div className="my-4 h-px bg-border-subtle" /><ExposureGroup title="Supplier payables" items={snapshot.payables} baseCurrency={baseCurrency} /></Panel>
            <Panel title="Foreign bank accounts" icon={<Landmark />}>
              {snapshot.foreign_banks.length ? <div className="space-y-2">{snapshot.foreign_banks.map((bank) => <BankRow key={bank.id} bank={bank} baseCurrency={baseCurrency} />)}</div> : <Empty text="No active foreign-currency bank accounts." />}
            </Panel>
          </div>
        </section>

        <Panel title="Revaluation history" icon={<FileClock />}>
          {snapshot.runs.length ? <div className="space-y-3">{snapshot.runs.map((run) => <RunCard key={run.id} run={run} lines={linesByRun.get(run.id) ?? []} baseCurrency={baseCurrency} canRevalue={snapshot.capabilities.can_revalue} busy={busy} reversalDate={reverseDates[run.id] ?? today} onReversalDate={(value) => setReverseDates((current) => ({ ...current, [run.id]: value }))} onAction={(name, args, success, key) => rpc(name, args, success, key)} businessId={businessId} />)}</div> : <Empty text="No FX revaluation runs yet." />}
        </Panel>

        <section className="grid gap-5 xl:grid-cols-2">
          <Panel title="Realized settlement differences" icon={<BadgeDollarSign />}>{snapshot.realized_settlements.length ? <div className="space-y-2">{snapshot.realized_settlements.map((settlement) => <SettlementRow key={`${settlement.type}-${settlement.id}`} settlement={settlement} baseCurrency={baseCurrency} />)}</div> : <Empty text="No realized FX gain or loss has been posted." />}</Panel>
          <Panel title="FX audit trail" icon={<ShieldCheck />}>{snapshot.audit.length ? <div className="max-h-[34rem] space-y-2 overflow-auto pr-1">{snapshot.audit.map((entry) => <AuditRow key={entry.id} entry={entry} />)}</div> : <Empty text="No FX audit activity yet." />}</Panel>
        </section>
      </div>
    </main>
  );
}
