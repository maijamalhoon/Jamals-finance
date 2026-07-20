"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Sparkles, WifiOff } from "lucide-react";

import AnalyticsRangeControls from "@/components/analytics/AnalyticsRangeControls";
import { CashFlowCharts } from "@/components/analytics/AnalyticsCharts";
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
  }, [invalidRangeWasReset, router, startTransition]);

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

  const noCurrentActivity = analysis.facts.incomeCount === 0 && analysis.facts.expenseCount === 0;

  return (
    <div className="min-h-full min-w-0 text-text-primary">
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
            <WifiOff aria-hidden="true" className="mt-1 size-4 shrink-0" />
            You are offline. The analytics already shown remain available; changing the range may wait for a connection.
          </InlineNotice>
        ) : null}

        {invalidRangeWasReset ? (
          <InlineNotice tone="info" role="status">
            That analytics range was not valid, so the page was safely reset to Month.
          </InlineNotice>
        ) : null}

        {transactionsStatus === "error" ? (
          <section className="finance-panel min-h-72 p-5" aria-labelledby="analytics-query-error-title">
            <div className="finance-panel-soft grid min-h-60 place-items-center px-5 text-center">
              <div className="max-w-lg">
                <AlertTriangle aria-hidden="true" className="mx-auto size-7 text-danger" />
                <h2 id="analytics-query-error-title" className="mt-3 text-lg font-bold text-text-primary">Transaction analytics could not be loaded</h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">This is a query failure, not an empty financial record. Your stored data was not changed. Refresh to try again.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            {noCurrentActivity ? (
              <InlineNotice tone="info" role="status">
                {hasAnyTransactions === false ?
                  "No transaction records exist yet. Add real income or expense records to begin analytics."
                : "No transactions fall inside this selected range. Try another period or choose a custom range."}
              </InlineNotice>
            ) : analysis.facts.expenseCount === 0 ? (
              <InlineNotice tone="info" role="status">This is an income-only period; spending sections correctly have no expense data.</InlineNotice>
            ) : analysis.facts.incomeCount === 0 ? (
              <InlineNotice tone="warning" role="status">This is an expense-only period. Savings rate is unavailable because no income was recorded.</InlineNotice>
            ) : null}

            <KpiSummary kpis={analysis.kpis} />
            <PeriodContext facts={analysis.facts} ranges={selection} />
            <section id="cash-flow" className="scroll-mt-32">
              <CashFlowCharts data={analysis.cashFlow} />
            </section>
            <IncomeSources summary={analysis.incomeSources} />
            <section id="spending-analysis" className="scroll-mt-32">
              <SpendingAnalysis categories={analysis.categories} accounts={analysis.accounts} accountsStatus={accountsStatus} />
            </section>
            <LargestEntries expenses={analysis.largestExpenses} income={analysis.largestIncome} />
          </>
        )}

        <InvestmentSnapshot investments={investments} status={investmentsStatus} />

        <p className="flex items-start gap-2 px-1 pb-2 text-xs leading-5 text-text-tertiary">
          <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          Analytics uses only stored transaction, category, account, source, and investment records. It does not infer merchants, connect banks, generate advice, or fabricate historical investment performance.
        </p>
      </div>
    </div>
  );
}
