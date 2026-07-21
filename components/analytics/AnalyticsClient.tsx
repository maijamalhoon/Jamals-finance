"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, WifiOff } from "lucide-react";

import { CashFlowCharts } from "@/components/analytics/AnalyticsCharts";
import AnalyticsRangeControls from "@/components/analytics/AnalyticsRangeControls";
import {
  IncomeSources,
  InvestmentSnapshot,
  KpiSummary,
  LargestEntries,
  PeriodContext,
  SpendingAnalysis,
} from "@/components/analytics/AnalyticsSections";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  buildAccountBreakdown,
  buildCashFlowSeriesForRange,
  buildExpenseCategoryBreakdown,
  buildIncomeSourceSummary,
  calculateKpisForRanges,
  calculatePeriodFacts,
  getLargestEntries,
  type AnalyticsAccountStatus,
  type AnalyticsDataStatus,
  type AnalyticsInvestmentData,
  type AnalyticsPeriod,
  type AnalyticsRangeSelection,
  type AnalyticsTransactionData,
} from "@/lib/analytics/calculations";

interface AnalyticsClientProps {
  transactions: AnalyticsTransactionData[];
  investments: AnalyticsInvestmentData[];
  transactionsStatus: AnalyticsDataStatus;
  accountsStatus: AnalyticsAccountStatus;
  investmentsStatus: AnalyticsDataStatus;
  hasAnyTransactions: boolean | null;
  selection: AnalyticsRangeSelection;
  invalidRangeWasReset: boolean;
  now: string;
}

export default function AnalyticsClient({
  transactions,
  investments,
  transactionsStatus,
  accountsStatus,
  investmentsStatus,
  hasAnyTransactions,
  selection,
  invalidRangeWasReset,
  now,
}: AnalyticsClientProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [online, setOnline] = useState(true);
  const { current, previous } = selection;

  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!invalidRangeWasReset) return;

    startTransition(() => {
      router.replace("/dashboard/analytics?period=month", { scroll: false });
    });
  }, [invalidRangeWasReset, router]);

  const analysis = useMemo(() => {
    const ranges = { current, previous };
    return {
      kpis: calculateKpisForRanges(transactions, ranges),
      facts: calculatePeriodFacts(transactions, current),
      cashFlow: buildCashFlowSeriesForRange(transactions, current),
      incomeSources: buildIncomeSourceSummary(transactions, current),
      categories: buildExpenseCategoryBreakdown(transactions, current),
      accounts: buildAccountBreakdown(transactions, current),
      largestExpenses: getLargestEntries(transactions, current, "expense"),
      largestIncome: getLargestEntries(transactions, current, "income"),
    };
  }, [current, previous, transactions]);

  function navigate(url: string) {
    startTransition(() => router.push(url, { scroll: false }));
  }

  function changePreset(period: Exclude<AnalyticsPeriod, "custom">) {
    navigate(`/dashboard/analytics?period=${period}`);
  }

  function changeCustom(start: string, end: string) {
    const query = new URLSearchParams({ period: "custom", from: start, to: end });
    navigate(`/dashboard/analytics?${query.toString()}`);
  }

  const noCurrentActivity = !analysis.cashFlow.some(
    (point) => point.income !== 0 || point.expenses !== 0,
  );

  return (
    <div
      data-analytics-page
      className="min-h-full min-w-0 pb-8 text-text-primary"
    >
      <div className="space-y-4 sm:space-y-5">
        <AnalyticsRangeControls
          selection={selection}
          now={now}
          pending={pending}
          onPresetChange={changePreset}
          onCustomChange={changeCustom}
        />

        {!online ? (
          <InlineNotice tone="warning" role="status" className="flex items-start gap-2">
            <WifiOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Offline. Current analytics remain visible; range changes may wait.
          </InlineNotice>
        ) : null}

        {invalidRangeWasReset ? (
          <InlineNotice tone="info" role="status">
            Invalid range reset to Month.
          </InlineNotice>
        ) : null}

        {transactionsStatus === "error" ? (
          <section
            className="finance-panel min-h-64 p-5"
            aria-labelledby="analytics-query-error-title"
          >
            <div className="grid min-h-52 place-items-center text-center">
              <div className="max-w-md">
                <AlertTriangle
                  aria-hidden="true"
                  className="mx-auto size-7 text-danger"
                />
                <h2
                  id="analytics-query-error-title"
                  className="mt-3 text-lg font-bold text-text-primary"
                >
                  Analytics could not be loaded
                </h2>
                <p className="mt-2 text-sm text-text-secondary">
                  Your stored records were not changed. Refresh to try again.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <>
            {noCurrentActivity ? (
              <InlineNotice tone="info" role="status">
                {hasAnyTransactions === false
                  ? "Add income or expenses to begin analytics."
                  : "No activity in this period. Choose another range."}
              </InlineNotice>
            ) : analysis.facts.expenseCount === 0 ? (
              <InlineNotice tone="info" role="status">
                Income-only period. Spending sections have no expense data.
              </InlineNotice>
            ) : analysis.facts.incomeCount === 0 ? (
              <InlineNotice tone="warning" role="status">
                Expense-only period. Savings rate is unavailable.
              </InlineNotice>
            ) : null}

            <KpiSummary kpis={analysis.kpis} />
            <PeriodContext facts={analysis.facts} ranges={selection} />

            <section id="cash-flow" className="scroll-mt-32">
              <CashFlowCharts data={analysis.cashFlow} />
            </section>

            <section id="spending-analysis" className="scroll-mt-32">
              <SpendingAnalysis
                categories={analysis.categories}
                accounts={analysis.accounts}
                accountsStatus={accountsStatus}
              />
            </section>

            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              <IncomeSources summary={analysis.incomeSources} />
              <LargestEntries
                expenses={analysis.largestExpenses}
                income={analysis.largestIncome}
              />
            </div>
          </>
        )}

        <InvestmentSnapshot
          investments={investments}
          status={investmentsStatus}
        />
      </div>
    </div>
  );
}
