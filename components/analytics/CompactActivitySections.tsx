"use client";

import { TrendingUp, WalletCards } from "@/components/icons/jalvoro/compat";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import { InlineNotice } from "@/components/ui/inline-notice";
import type { AccountActivityItem } from "@/lib/analytics/account-activity";
import type {
  AnalyticsDataStatus,
  IncomeSourceSummary,
} from "@/lib/analytics/calculations";

export function CompactIncomeSources({
  summary,
}: {
  summary: IncomeSourceSummary;
}) {
  const { formatCurrency } = useCurrency();

  return (
    <section
      className="finance-panel min-w-0 p-4 sm:p-5"
      aria-labelledby="compact-income-sources-title"
    >
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp
          aria-hidden="true"
          size={16}
          strokeWidth={2.35}
          className="text-success"
        />
        <h2
          id="compact-income-sources-title"
          className="text-sm font-semibold text-text-primary"
        >
          Income sources
        </h2>
      </div>

      {summary.items.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          No income sources in this period.
        </p>
      ) : (
        <div className="space-y-3">
          {summary.items.slice(0, 8).map((source) => (
            <article
              key={source.id}
              className="finance-panel-soft flex min-w-0 items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold text-text-primary"
                  title={source.name}
                >
                  {source.name}
                </p>
                <p className="mt-0.5 text-xs text-text-secondary">
                  {source.percentage.toFixed(1)}% of income
                </p>
              </div>
              <p className="max-w-[11rem] shrink-0 break-words text-right text-sm font-bold tabular-nums text-success">
                {formatCurrency(source.amount)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function AccountActivity({
  accounts,
  transfersStatus,
}: {
  accounts: AccountActivityItem[];
  transfersStatus: AnalyticsDataStatus;
}) {
  const { formatCurrency } = useCurrency();
  const highestSpendingAccount = [...accounts]
    .filter((account) => account.expenses > 0)
    .sort(
      (left, right) =>
        right.expenses - left.expenses || left.name.localeCompare(right.name),
    )[0];
  const totalExpenses = accounts.reduce(
    (sum, account) => sum + account.expenses,
    0,
  );
  const highestSpendingPercentage =
    highestSpendingAccount && totalExpenses > 0
      ? (highestSpendingAccount.expenses / totalExpenses) * 100
      : null;

  return (
    <section
      className="finance-panel min-w-0 p-4 sm:p-5"
      aria-labelledby="analytics-account-activity-title"
    >
      <div className="mb-4 flex items-center gap-2">
        <WalletCards
          aria-hidden="true"
          size={16}
          strokeWidth={2.35}
          className="text-info"
        />
        <h2
          id="analytics-account-activity-title"
          className="text-sm font-semibold text-text-primary"
        >
          Account activity
        </h2>
      </div>

      {transfersStatus === "error" ? (
        <InlineNotice tone="warning" className="mb-4">
          Transfer totals are unavailable. Income and spending remain visible.
        </InlineNotice>
      ) : null}

      {accounts.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          No account activity in this period.
        </p>
      ) : (
        <div className="space-y-3">
          {accounts.slice(0, 8).map((account) => (
            <article
              key={account.id}
              className="finance-panel-soft min-w-0 p-3"
            >
              <p
                className="truncate text-sm font-semibold text-text-primary"
                title={account.name}
              >
                {account.name}
              </p>
              <div className="mt-2 grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:grid-cols-4">
                <span className="min-w-0 break-words text-success">
                  In {formatCurrency(account.income)}
                </span>
                <span className="min-w-0 break-words text-danger">
                  Out {formatCurrency(account.expenses)}
                </span>
                <span className="min-w-0 break-words text-info">
                  Transfer in {formatCurrency(account.transfersIn)}
                </span>
                <span className="min-w-0 break-words text-info">
                  Transfer out {formatCurrency(account.transfersOut)}
                </span>
              </div>
            </article>
          ))}
        </div>
      )}

      {highestSpendingAccount && highestSpendingPercentage !== null ? (
        <p className="mt-3 text-xs text-text-secondary">
          Highest spending account: {highestSpendingAccount.name} (
          {highestSpendingPercentage.toFixed(1)}%).
        </p>
      ) : null}
    </section>
  );
}
