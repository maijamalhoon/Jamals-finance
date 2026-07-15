"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Landmark,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { InlineNotice } from "@/components/ui/inline-notice";
import { SpendingDistributionChart } from "@/components/analytics/AnalyticsCharts";
import {
  formatRangeLabel,
  getChangeDirection,
  summarizeInvestmentPortfolio,
  type AccountBreakdownItem,
  type AnalyticsAccountStatus,
  type AnalyticsDataStatus,
  type AnalyticsInvestmentData,
  type AnalyticsKpis,
  type CategoryBreakdownItem,
  type ChangeResult,
  type IncomeSourceSummary,
  type LargestEntry,
  type PeriodFacts,
  type PeriodRanges,
} from "@/lib/analytics/calculations";

function ChangeBadge({ change }: { change: ChangeResult }) {
  const direction = getChangeDirection(change);
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : null;
  const className =
    change.sentiment === "positive" ? "border-success/25 bg-success/10 text-success" :
    change.sentiment === "negative" ? "border-danger/25 bg-danger/10 text-danger" :
    change.sentiment === "warning" ? "border-warning/25 bg-warning/10 text-warning" :
    "border-border bg-muted text-text-secondary";
  return (
    <span className={`inline-flex min-h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-bold ${className}`}>
      {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
      {change.label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  change: ChangeResult;
  icon: typeof TrendingUp;
  tone: "income" | "expense" | "net" | "rate";
}) {
  const toneClass =
    tone === "income" ? "text-success bg-success/10" :
    tone === "expense" ? "text-danger bg-danger/10" :
    tone === "rate" ? "text-warning bg-warning/10" :
    "text-primary bg-primary/10";
  return (
    <article className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className={`grid size-10 shrink-0 place-items-center rounded-[var(--radius-control)] ${toneClass}`}>
          <Icon aria-hidden="true" className="size-5" />
        </div>
        <ChangeBadge change={change} />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.11em] text-text-tertiary">{label}</p>
      <p className="mt-1 min-w-0 break-words text-[clamp(1.35rem,5vw,2rem)] font-extrabold leading-tight tabular-nums text-text-primary">
        {value}
      </p>
    </article>
  );
}

export function KpiSummary({ kpis }: { kpis: AnalyticsKpis }) {
  const { formatCurrency } = useCurrency();
  return (
    <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Total income" value={formatCurrency(kpis.totalIncome)} change={kpis.incomeChange} icon={TrendingUp} tone="income" />
      <KpiCard label="Total expenses" value={formatCurrency(kpis.totalExpenses)} change={kpis.expensesChange} icon={TrendingDown} tone="expense" />
      <KpiCard label="Net savings" value={formatCurrency(kpis.netSavings)} change={kpis.netSavingsChange} icon={PiggyBank} tone="net" />
      <KpiCard label="Savings rate" value={kpis.savingsRate === null ? "Not available" : `${kpis.savingsRate}%`} change={kpis.savingsRateChange} icon={CircleDollarSign} tone="rate" />
    </div>
  );
}

export function PeriodContext({ facts, ranges }: { facts: PeriodFacts; ranges: PeriodRanges }) {
  const { formatCurrency } = useCurrency();
  const items = [
    ["Calendar days", String(facts.inclusiveDays)],
    ["Income entries", String(facts.incomeCount)],
    ["Expense entries", String(facts.expenseCount)],
    ["Avg daily income", formatCurrency(facts.averageDailyIncome)],
    ["Avg daily spending", formatCurrency(facts.averageDailySpending)],
  ];
  return (
    <section className="finance-panel-soft min-w-0 p-4 sm:p-5" aria-labelledby="analytics-context-title">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:items-center">
        <div className="min-w-0">
          <h2 id="analytics-context-title" className="text-sm font-bold text-text-primary">Period context</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Compared with {formatRangeLabel(ranges.previous)}. The comparison follows the same elapsed position or the same custom-range length.
          </p>
        </div>
        <dl className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {items.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-semibold text-text-tertiary">{label}</dt>
              <dd className="mt-1 min-w-0 break-words text-sm font-bold tabular-nums text-text-primary">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function SectionHeading({ id, eyebrow, title, description }: { id?: string; eyebrow: string; title: string; description: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">{eyebrow}</p>
      <h2 id={id} className="mt-1 text-lg font-bold text-text-primary">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
    </div>
  );
}

function RankedList({ items, emptyMessage }: { items: Array<{ id: string; name: string; amount: number; percentage: number; detail?: string | null }>; emptyMessage: string }) {
  const { formatCurrency } = useCurrency();
  if (items.length === 0) return <div className="finance-panel-soft px-5 py-8 text-center text-sm text-text-secondary">{emptyMessage}</div>;
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-control)] border border-border/70 bg-background/35 p-3">
          <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-bold text-text-secondary">{index + 1}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary" title={item.name}>{item.name}</p>
            <p className="text-xs text-text-tertiary">{item.detail || `${item.percentage}% of total`}</p>
          </div>
          <p className="max-w-[9rem] break-words text-right text-sm font-bold tabular-nums text-text-primary">{formatCurrency(item.amount)}</p>
        </li>
      ))}
    </ol>
  );
}

export function IncomeSources({ summary }: { summary: IncomeSourceSummary }) {
  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="income-sources-title">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading id="income-sources-title" eyebrow="Income analysis" title="Income sources" description="Ranked only from explicit source metadata stored on income entries; missing sources stay unspecified." />
        {summary.totalEntries > 0 ? (
          <p className="shrink-0 text-xs text-text-tertiary">
            {summary.explicitEntries} of {summary.totalEntries} entries name a source
          </p>
        ) : null}
      </div>
      <div className="mt-5">
        <RankedList items={summary.items} emptyMessage="No income was recorded in this date range." />
      </div>
    </section>
  );
}

export function SpendingAnalysis({
  categories,
  accounts,
  accountsStatus,
}: {
  categories: CategoryBreakdownItem[];
  accounts: AccountBreakdownItem[];
  accountsStatus: AnalyticsAccountStatus;
}) {
  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="spending-analysis-title">
      <SectionHeading id="spending-analysis-title" eyebrow="Spending analysis" title="Where the money went" description="Expense totals grouped by stable category and account identifiers, with every valid amount represented." />
      {accountsStatus === "partial" ? (
        <InlineNotice tone="warning" className="mt-4">
          Expense totals are available, but some account labels could not be loaded. Those rows are shown as Unknown account.
        </InlineNotice>
      ) : null}
      <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-bold text-text-primary">Spending by category</h3>
          <SpendingDistributionChart data={categories} />
        </div>
        <div className="min-w-0">
          <h3 className="mb-3 text-sm font-bold text-text-primary">Spending by account</h3>
          <RankedList
            items={accounts.map((item) => ({ ...item, detail: item.type ? `${item.type} · ${item.percentage}% of expenses` : `${item.percentage}% of expenses` }))}
            emptyMessage="No account spending was recorded in this date range."
          />
        </div>
      </div>
    </section>
  );
}

function EntryList({ entries, emptyMessage }: { entries: LargestEntry[]; emptyMessage: string }) {
  const { formatCurrency } = useCurrency();
  if (entries.length === 0) return <div className="finance-panel-soft px-5 py-8 text-center text-sm text-text-secondary">{emptyMessage}</div>;
  return (
    <ol className="divide-y divide-border/70">
      {entries.map((entry) => (
        <li key={entry.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text-primary" title={entry.title}>{entry.title}</p>
            <p className="mt-1 text-xs text-text-tertiary">
              {entry.date} · {entry.categoryName}{entry.accountName ? ` · ${entry.accountName}` : ""}
            </p>
          </div>
          <p className="max-w-[9rem] break-words text-right text-sm font-bold tabular-nums text-text-primary">{formatCurrency(entry.amount)}</p>
        </li>
      ))}
    </ol>
  );
}

export function LargestEntries({ expenses, income }: { expenses: LargestEntry[]; income: LargestEntry[] }) {
  return (
    <section className="min-w-0" aria-labelledby="largest-entries-title">
      <SectionHeading id="largest-entries-title" eyebrow="Entry analysis" title="Largest entries" description="Highest-value stored entries in the selected period. Notes are not reinterpreted as merchant or source data." />
      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
        <article className="finance-panel min-w-0 p-4 sm:p-5">
          <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-text-primary"><ReceiptText aria-hidden="true" className="size-4 text-danger" />Largest expenses</h3>
          <EntryList entries={expenses} emptyMessage="No expense entries were recorded in this date range." />
        </article>
        <article className="finance-panel min-w-0 p-4 sm:p-5">
          <h3 className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-text-primary"><WalletCards aria-hidden="true" className="size-4 text-success" />Largest income</h3>
          <EntryList entries={income} emptyMessage="No income entries were recorded in this date range." />
        </article>
      </div>
    </section>
  );
}

export function InvestmentSnapshot({
  investments,
  status,
}: {
  investments: AnalyticsInvestmentData[];
  status: AnalyticsDataStatus;
}) {
  const { formatCurrency } = useCurrency();
  const portfolio = summarizeInvestmentPortfolio(investments, 5);
  const totalPnlPct = portfolio.totalInvested > 0 ? (portfolio.totalPnl / portfolio.totalInvested) * 100 : null;
  const pnlTone = portfolio.totalPnl > 0 ? "text-success" : portfolio.totalPnl < 0 ? "text-danger" : "text-text-secondary";

  return (
    <section className="finance-panel min-w-0 p-4 sm:p-5" aria-labelledby="portfolio-snapshot-title">
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading id="portfolio-snapshot-title" eyebrow="Investments" title="Current portfolio snapshot" description="Present quantities, stored purchase prices, and current stored prices. This snapshot is not filtered by the transaction date range and is not historical period performance." />
        <Landmark aria-hidden="true" className="size-7 shrink-0 text-primary" />
      </div>

      {status === "error" ? (
        <InlineNotice tone="danger" className="mt-5">Investment records could not be loaded. Transaction analytics remain unaffected.</InlineNotice>
      ) : investments.length === 0 ? (
        <div className="finance-panel-soft mt-5 px-5 py-9 text-center text-sm text-text-secondary">No investment records are available for the current snapshot.</div>
      ) : (
        <>
          <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3">
            <div className="finance-panel-soft min-w-0 p-4"><dt className="text-xs text-text-tertiary">Current value</dt><dd className="mt-1 break-words text-xl font-extrabold tabular-nums text-text-primary">{formatCurrency(portfolio.totalValue)}</dd></div>
            <div className="finance-panel-soft min-w-0 p-4"><dt className="text-xs text-text-tertiary">Total invested</dt><dd className="mt-1 break-words text-xl font-extrabold tabular-nums text-text-primary">{formatCurrency(portfolio.totalInvested)}</dd></div>
            <div className="finance-panel-soft min-w-0 p-4"><dt className="text-xs text-text-tertiary">Unrealized P/L</dt><dd className={`mt-1 break-words text-xl font-extrabold tabular-nums ${pnlTone}`}>{formatCurrency(portfolio.totalPnl)}{totalPnlPct === null ? "" : ` (${totalPnlPct > 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%)`}</dd></div>
          </dl>

          <div className="mt-5">
            <h3 className="mb-3 text-sm font-bold text-text-primary">Top holdings by current value</h3>
            <ol className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {portfolio.displayedHoldings.map((holding) => (
                <li key={holding.id} className="min-w-0 rounded-[var(--radius-control)] border border-border/70 bg-background/35 p-3">
                  <div className="flex min-w-0 items-center gap-2"><span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: holding.color }} /><p className="truncate text-sm font-semibold text-text-primary" title={holding.name}>{holding.name}</p></div>
                  <p className="mt-2 break-words text-sm font-bold tabular-nums text-text-primary">{formatCurrency(holding.value)}</p>
                  <p className="mt-1 text-xs text-text-tertiary">{holding.symbol || holding.type}</p>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
