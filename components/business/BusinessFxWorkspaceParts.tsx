import type { ReactNode } from "react";
import { BookOpenCheck, RefreshCcw, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  BusinessFxAudit,
  BusinessFxBank,
  BusinessFxExposure,
  BusinessFxLine,
  BusinessFxRun,
  BusinessFxSettlement,
} from "@/lib/business-fx";

export const inputClass =
  "finance-focus min-h-11 w-full rounded-[var(--radius-button)] border-0 bg-surface-secondary px-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary";

export function amount(value: number | null | undefined, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));
}

export function number(value: number | null | undefined, digits = 6) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: digits }).format(Number(value ?? 0));
}

export function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SummaryCard({ label: title, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-4 py-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-xs font-black uppercase tracking-[0.1em]">{title}</span></div>
      <strong className="mt-3 block truncate text-lg font-black text-text-primary">{value}</strong>
    </article>
  );
}

export function Panel({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
      <div className="flex items-center gap-2 text-text-primary"><span className="text-primary">{icon}</span><h2 className="font-black">{title}</h2></div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function Field({ label: title, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-black text-text-secondary">{title}</span>{children}</label>;
}

export function Empty({ text }: { text: string }) {
  return <div className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-7 text-center text-sm text-text-secondary">{text}</div>;
}

export function ExposureGroup({ title, items, baseCurrency }: { title: string; items: BusinessFxExposure[]; baseCurrency: string }) {
  return (
    <div>
      <h3 className="text-sm font-black text-text-primary">{title}</h3>
      <div className="mt-2 space-y-2">
        {items.length ? items.map((item) => (
          <article key={item.id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div><strong className="text-sm text-text-primary">{item.code}</strong><p className="mt-1 text-xs text-text-secondary">Due {item.due_date}</p></div>
              <strong className="text-sm text-text-primary">{number(item.transaction_balance)} {item.currency}</strong>
            </div>
            <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
              <Metric label="Carrying" value={amount(item.carrying_base, baseCurrency)} />
              <Metric label="Latest rate" value={item.latest_rate ? number(item.latest_rate, 10) : "Missing"} warning={!item.latest_rate} />
              <Metric label="Estimated" value={item.estimated_base === null ? "Unavailable" : amount(item.estimated_base, baseCurrency)} />
            </div>
          </article>
        )) : <p className="text-sm text-text-secondary">None.</p>}
      </div>
    </div>
  );
}

export function Metric({ label: title, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div><span className="block text-text-tertiary">{title}</span><strong className={warning ? "text-warning" : "text-text-primary"}>{value}</strong></div>;
}

export function BankRow({ bank, baseCurrency }: { bank: BusinessFxBank; baseCurrency: string }) {
  return (
    <article className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><strong className="text-sm text-text-primary">{bank.name}</strong><p className="mt-1 text-xs text-text-secondary">{bank.institution_name ?? "Bank account"} · {bank.currency}</p></div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${bank.mixed_currency_ledger ? "bg-warning-soft text-warning" : "bg-success-soft text-success"}`}>
          {bank.mixed_currency_ledger ? "Excluded: mixed ledger" : "Eligible"}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
        <Metric label="Opening foreign" value={`${number(bank.opening_balance_transaction)} ${bank.currency}`} />
        <Metric label={`Opening ${baseCurrency}`} value={amount(bank.opening_balance_base, baseCurrency)} />
        <Metric label="Latest rate" value={bank.latest_rate ? number(bank.latest_rate, 10) : "Missing"} warning={!bank.latest_rate} />
      </div>
    </article>
  );
}

export function RunCard({ run, lines, baseCurrency, canRevalue, busy, reversalDate, onReversalDate, onAction, businessId }: {
  run: BusinessFxRun;
  lines: BusinessFxLine[];
  baseCurrency: string;
  canRevalue: boolean;
  busy: string | null;
  reversalDate: string;
  onReversalDate: (value: string) => void;
  onAction: (name: string, args: Record<string, unknown>, success: string, key: string) => Promise<boolean>;
  businessId: string;
}) {
  return (
    <article className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-text-primary">{run.run_code}</strong><Status status={run.status} /></div>
          <p className="mt-1 text-xs text-text-secondary">Closing {run.closing_date} · {run.exposure_count} exposures{run.skipped_bank_count ? ` · ${run.skipped_bank_count} banks excluded` : ""}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-xs"><Metric label="Unrealized gain" value={amount(run.total_gain_base, baseCurrency)} /><Metric label="Unrealized loss" value={amount(run.total_loss_base, baseCurrency)} /></div>
        </div>
        {canRevalue ? (
          <div className="flex flex-wrap items-end gap-2">
            {run.status === "draft" ? <>
              <Button type="button" size="sm" variant="outline" loading={busy === `recalc-${run.id}`} loadingLabel="Calculating…" onClick={() => void onAction("recalculate_business_fx_revaluation_run", { p_business_id: businessId, p_run_id: run.id }, "FX exposure recalculated.", `recalc-${run.id}`)}><RefreshCcw aria-hidden="true" /> Recalculate</Button>
              <Button type="button" size="sm" loading={busy === `post-${run.id}`} loadingLabel="Posting…" onClick={() => void onAction("post_business_fx_revaluation_run", { p_business_id: businessId, p_run_id: run.id }, "FX revaluation posted.", `post-${run.id}`)}><BookOpenCheck aria-hidden="true" /> Post</Button>
              <Button type="button" size="sm" variant="ghost" loading={busy === `cancel-${run.id}`} loadingLabel="Cancelling…" onClick={() => void onAction("cancel_business_fx_revaluation_run", { p_business_id: businessId, p_run_id: run.id }, "Draft FX revaluation cancelled.", `cancel-${run.id}`)}><Trash2 aria-hidden="true" /> Cancel</Button>
            </> : null}
            {run.status === "posted" ? <>
              <Field label="Reversal date"><input type="date" min={run.closing_date} className={`${inputClass} w-40`} value={reversalDate} onChange={(event) => onReversalDate(event.target.value)} /></Field>
              <Button type="button" size="sm" loading={busy === `reverse-${run.id}`} loadingLabel="Reversing…" onClick={() => void onAction("reverse_business_fx_revaluation_run", { p_business_id: businessId, p_run_id: run.id, p_reversal_date: reversalDate }, "FX revaluation reversed.", `reverse-${run.id}`)}><Undo2 aria-hidden="true" /> Reverse</Button>
            </> : null}
          </div>
        ) : null}
      </div>
      {lines.length ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead className="text-text-tertiary"><tr><th className="pb-2 pr-4">Exposure</th><th className="pb-2 pr-4">Foreign balance</th><th className="pb-2 pr-4">Rate</th><th className="pb-2 text-right">Adjustment</th></tr></thead><tbody>{lines.map((line) => <tr key={line.id} className="border-t border-border-subtle"><td className="py-2 pr-4 font-bold text-text-primary">{line.exposure_code}<span className="ml-2 font-normal text-text-tertiary">{label(line.exposure_type)}</span></td><td className="py-2 pr-4">{number(line.transaction_balance)} {line.currency}</td><td className="py-2 pr-4">{number(line.closing_rate, 10)}</td><td className={`py-2 text-right font-bold ${line.adjustment_base >= 0 ? "text-success" : "text-danger"}`}>{amount(line.adjustment_base, baseCurrency)}</td></tr>)}</tbody></table></div> : null}
    </article>
  );
}

export function Status({ status }: { status: BusinessFxRun["status"] }) {
  const tone = status === "posted" ? "bg-warning-soft text-warning" : status === "reversed" ? "bg-success-soft text-success" : status === "cancelled" ? "bg-surface text-text-tertiary" : "bg-primary-soft text-primary";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${tone}`}>{status}</span>;
}

export function SettlementRow({ settlement, baseCurrency }: { settlement: BusinessFxSettlement; baseCurrency: string }) {
  const gain = settlement.realized_gain_base > 0;
  return (
    <article className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><strong className="text-sm text-text-primary">{settlement.document_code}</strong><p className="mt-1 text-xs text-text-secondary">{label(settlement.type)} · {settlement.payment_date}</p></div><strong className={gain ? "text-success" : "text-danger"}>{gain ? "+" : "-"}{amount(gain ? settlement.realized_gain_base : settlement.realized_loss_base, baseCurrency)}</strong></div>
      <p className="mt-2 text-xs text-text-secondary">{number(settlement.transaction_amount)} {settlement.currency} at {number(settlement.settlement_rate, 10)} · Carrying {amount(settlement.carrying_base, baseCurrency)} · Settled {amount(settlement.settlement_base, baseCurrency)}</p>
    </article>
  );
}

export function AuditRow({ entry }: { entry: BusinessFxAudit }) {
  return <article className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3"><strong className="text-sm text-text-primary">{label(entry.action)}</strong><p className="mt-1 text-xs text-text-secondary">{new Date(entry.created_at).toLocaleString()}</p></article>;
}
