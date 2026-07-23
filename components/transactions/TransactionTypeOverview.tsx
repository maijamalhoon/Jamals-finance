import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Layers3,
  WalletCards,
} from "lucide-react";

import Money from "@/components/currency/Money";
import TransactionPagination from "@/components/transactions/TransactionPagination";
import TransactionRow from "@/components/transactions/TransactionRow";
import type { PaginationState } from "@/lib/pagination";
import type { LoadedTransaction } from "@/lib/transactions";

export type TransactionPageTone = "income" | "expense";

export type TransactionPageBreakdownItem = {
  id: string;
  name: string;
  amount: number;
  count: number;
  color: string;
};

export type TransactionPageAccountItem = {
  name: string;
  amount: number;
  count: number;
};

export type TransactionPageMonthItem = {
  key: string;
  label: string;
  amount: number;
};

type TransactionTypeOverviewProps = {
  tone: TransactionPageTone;
  action: ReactNode;
  thisMonth: number;
  thisYear: number;
  recordMonthAmount: number;
  recordMonthLabel: string;
  thisMonthEntryCount: number;
  monthlySeries: TransactionPageMonthItem[];
  breakdownTitle: string;
  breakdownLabel: string;
  breakdownItems: TransactionPageBreakdownItem[];
  accountItems: TransactionPageAccountItem[];
  visibleTransactions: LoadedTransaction[];
  totalTransactions: number;
  pagination: PaginationState;
  basePath: string;
};

const TONE = {
  income: {
    accent: "var(--success)",
    soft: "bg-success/10",
    text: "text-success",
    icon: ArrowUpRight,
    eyebrow: "Income overview",
    monthLabel: "Received this month",
    yearLabel: "Received this year",
    recordLabel: "Best month",
    activityTitle: "Income history",
    itemLabel: "income entries",
    columnLabel: "Source",
  },
  expense: {
    accent: "var(--danger)",
    soft: "bg-danger/10",
    text: "text-danger",
    icon: ArrowDownRight,
    eyebrow: "Expense overview",
    monthLabel: "Spent this month",
    yearLabel: "Spent this year",
    recordLabel: "Highest month",
    activityTitle: "Expense history",
    itemLabel: "expense entries",
    columnLabel: "Category",
  },
} as const;

function compactCount(value: number) {
  return new Intl.NumberFormat("en", { notation: "compact" }).format(value);
}

function SummaryMetric({
  label,
  value,
  helper,
  toneClass,
}: {
  label: string;
  value: ReactNode;
  helper?: string;
  toneClass?: string;
}) {
  return (
    <div className="min-w-0 py-1">
      <dt className="text-[10px] font-bold uppercase tracking-[0.11em] text-text-tertiary">
        {label}
      </dt>
      <dd
        className={`mt-1 min-w-0 break-words text-base font-bold tabular-nums tracking-tight [overflow-wrap:anywhere] sm:text-lg ${toneClass ?? "text-text-primary"}`}
      >
        {value}
      </dd>
      {helper ? (
        <p className="mt-0.5 truncate text-[11px] text-text-secondary">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function MonthlyTrend({
  data,
  accent,
}: {
  data: TransactionPageMonthItem[];
  accent: string;
}) {
  const maximum = Math.max(0, ...data.map((item) => item.amount));

  return (
    <div className="min-w-0 rounded-[22px] bg-surface-primary/42 px-4 py-4 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-text-primary">Six-month trend</p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            Monthly totals
          </p>
        </div>
        <CalendarDays aria-hidden="true" className="size-4 text-text-tertiary" />
      </div>

      <div className="mt-5 grid h-32 grid-cols-6 items-end gap-2 sm:gap-3">
        {data.map((item) => {
          const height =
            maximum > 0 ? Math.max(7, (item.amount / maximum) * 100) : 7;

          return (
            <div
              key={item.key}
              className="flex min-w-0 flex-col items-center justify-end gap-2"
              title={`${item.label}: ${item.amount}`}
            >
              <div className="flex h-24 w-full items-end justify-center">
                <div
                  className="w-full max-w-8 rounded-full opacity-85 transition-[height,opacity] duration-200 hover:opacity-100"
                  style={{
                    height: `${height}%`,
                    background: `linear-gradient(180deg, color-mix(in srgb, ${accent} 88%, white), ${accent})`,
                  }}
                />
              </div>
              <span className="truncate text-[10px] font-semibold text-text-tertiary">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RankedBreakdown({
  title,
  label,
  items,
  total,
  accent,
}: {
  title: string;
  label: string;
  items: TransactionPageBreakdownItem[];
  total: number;
  accent: string;
}) {
  return (
    <section className="min-w-0 rounded-[26px] bg-card px-4 py-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
            This month
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-text-primary sm:text-lg">
            {title}
          </h2>
        </div>
        <Layers3 aria-hidden="true" className="size-5 shrink-0 text-text-tertiary" />
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-[18px] bg-surface-secondary/45 px-4 py-8 text-center text-sm text-text-secondary">
          No {label.toLowerCase()} data is available this month.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {items.map((item) => {
            const percentage = total > 0 ? (item.amount / total) * 100 : 0;
            return (
              <div key={item.id} className="min-w-0">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-1 size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: item.color || accent }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-text-secondary">
                        {item.count} {item.count === 1 ? "entry" : "entries"}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-0 max-w-[55%] text-right">
                    <p className="break-words text-sm font-bold tabular-nums text-text-primary [overflow-wrap:anywhere]">
                      <Money amount={item.amount} />
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold text-text-tertiary">
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(2, Math.min(100, percentage))}%`,
                      backgroundColor: item.color || accent,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function AccountDistribution({
  items,
  accent,
}: {
  items: TransactionPageAccountItem[];
  accent: string;
}) {
  const maximum = Math.max(0, ...items.map((item) => item.amount));

  return (
    <section className="min-w-0 rounded-[26px] bg-card px-4 py-5 sm:px-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
            Accounts
          </p>
          <h2 className="mt-1 text-base font-semibold text-text-primary sm:text-lg">
            Money by account
          </h2>
        </div>
        <WalletCards aria-hidden="true" className="size-5 text-text-tertiary" />
      </div>

      {items.length === 0 ? (
        <p className="mt-5 rounded-[18px] bg-surface-secondary/45 px-4 py-8 text-center text-sm text-text-secondary">
          No linked account data is available.
        </p>
      ) : (
        <ol className="mt-4 divide-y divide-border/45">
          {items.map((item, index) => {
            const width = maximum > 0 ? (item.amount / maximum) * 100 : 0;
            return (
              <li key={item.name} className="py-3.5 first:pt-1 last:pb-0">
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-secondary text-[10px] font-bold text-text-secondary">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <p className="min-w-0 truncate text-sm font-semibold text-text-primary">
                      {item.name}
                    </p>
                    <div className="min-w-0 max-w-[58%] text-right">
                      <p className="break-words text-sm font-bold tabular-nums text-text-primary [overflow-wrap:anywhere]">
                        <Money amount={item.amount} />
                      </p>
                      <p className="mt-0.5 text-[10px] text-text-tertiary">
                        {compactCount(item.count)} {item.count === 1 ? "entry" : "entries"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="h-full rounded-full opacity-80"
                    style={{ width: `${Math.max(3, width)}%`, backgroundColor: accent }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export default function TransactionTypeOverview({
  tone,
  action,
  thisMonth,
  thisYear,
  recordMonthAmount,
  recordMonthLabel,
  thisMonthEntryCount,
  monthlySeries,
  breakdownTitle,
  breakdownLabel,
  breakdownItems,
  accountItems,
  visibleTransactions,
  totalTransactions,
  pagination,
  basePath,
}: TransactionTypeOverviewProps) {
  const config = TONE[tone];
  const ToneIcon = config.icon;

  return (
    <div className="space-y-4 sm:space-y-5">
      {action}

      <section
        className="min-w-0 overflow-hidden rounded-[30px] bg-card px-4 py-5 sm:px-6 sm:py-6"
        style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${config.accent} 7%, var(--card)) 0%, var(--card) 58%, color-mix(in srgb, ${config.accent} 3%, var(--card)) 100%)`,
        }}
      >
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(22rem,0.9fr)] xl:items-stretch">
          <div className="min-w-0 px-1 py-1 sm:px-2">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
              <span className={`grid size-7 place-items-center rounded-[10px] ${config.soft} ${config.text}`}>
                <ToneIcon aria-hidden="true" className="size-4" />
              </span>
              {config.eyebrow}
            </div>

            <p className="mt-5 text-xs font-semibold text-text-secondary">
              {config.monthLabel}
            </p>
            <p className="mt-1 min-w-0 break-words text-[clamp(2rem,7vw,3.5rem)] font-black leading-none tabular-nums tracking-[-0.04em] text-text-primary [overflow-wrap:anywhere]">
              <Money amount={thisMonth} />
            </p>

            <dl className="mt-6 grid min-w-0 grid-cols-2 gap-x-5 gap-y-4 border-t border-border/40 pt-5 sm:grid-cols-3">
              <SummaryMetric
                label={config.yearLabel}
                value={<Money amount={thisYear} />}
              />
              <SummaryMetric
                label={config.recordLabel}
                value={<Money amount={recordMonthAmount} />}
                helper={recordMonthLabel}
                toneClass={config.text}
              />
              <SummaryMetric
                label="Entries this month"
                value={thisMonthEntryCount.toLocaleString("en-US")}
                helper={`${totalTransactions.toLocaleString("en-US")} total`}
              />
            </dl>
          </div>

          <MonthlyTrend data={monthlySeries} accent={config.accent} />
        </div>
      </section>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <RankedBreakdown
          title={breakdownTitle}
          label={breakdownLabel}
          items={breakdownItems}
          total={thisMonth}
          accent={config.accent}
        />
        <AccountDistribution items={accountItems} accent={config.accent} />
      </div>

      <section className="min-w-0 rounded-[26px] bg-card px-3 py-4 sm:px-5 sm:py-5">
        <div className="mb-4 flex min-w-0 items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
              Activity
            </p>
            <h2 className="mt-1 text-base font-semibold text-text-primary sm:text-lg">
              {config.activityTitle}
            </h2>
          </div>
          <span className="shrink-0 text-xs font-semibold tabular-nums text-text-secondary">
            {pagination.startIndex + 1}-{pagination.endIndex} of {totalTransactions}
          </span>
        </div>

        <div className="desktop-list-header mb-1">
          <div className="w-10 flex-shrink-0" />
          <p className="flex-1">Description</p>
          <p className="w-32">{config.columnLabel}</p>
          <p className="w-20 text-center">Type</p>
          <p className="w-32 text-right">Amount</p>
          <p className="w-24 text-right">Date</p>
          <div className="w-16 flex-shrink-0" />
        </div>

        <div className="space-y-1">
          {visibleTransactions.map((transaction) => (
            <TransactionRow key={transaction.id} tx={transaction as any} />
          ))}
        </div>

        <TransactionPagination
          {...pagination}
          basePath={basePath}
          itemLabel={config.itemLabel}
        />
      </section>
    </div>
  );
}
