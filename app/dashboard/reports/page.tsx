import { Suspense } from "react";
import {
  Activity,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "@/components/icons/jalvoro/compat";

import Money from "@/components/currency/Money";
import CategoryBreakdown from "@/components/reports/CategoryBreakdown";
import ExportButton from "@/components/reports/ExportButton";
import MonthlyChart from "@/components/reports/MonthlyChart";
import ReportRangeControls from "@/components/reports/ReportRangeControls";
import { InlineNotice } from "@/components/ui/inline-notice";
import {
  buildAccountBreakdown,
  buildCashFlowSeriesForRange,
  buildExpenseCategoryBreakdown,
  buildIncomeSourceSummary,
  calculatePeriodFacts,
  formatRangeLabel,
  parseAnalyticsSearchParams,
  parseDateKey,
  sumTransactions,
  toFiniteNumber,
  type AnalyticsSearchParams,
  type AnalyticsTransactionData,
} from "@/lib/analytics/calculations";
import { getAppDateKey } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ReportPeriod = "week" | "month" | "sixMonth" | "year" | "custom";

interface RawCategory {
  id?: string | null;
  name?: string | null;
  color?: string | null;
}

interface RawAccount {
  id?: string | null;
  name?: string | null;
  type?: string | null;
}

interface RawTransaction {
  id?: string | null;
  type?: string | null;
  amount?: number | string | null;
  date?: string | null;
  category_id?: string | null;
  account_id?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  deleted_at?: string | null;
  categories?: RawCategory | RawCategory[] | null;
  accounts?: RawAccount | RawAccount[] | null;
}

interface RawTransfer {
  id?: string | null;
  amount?: number | string | null;
  deleted_at?: string | null;
  from_account?: RawAccount | RawAccount[] | null;
  to_account?: RawAccount | RawAccount[] | null;
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function positiveNumber(value: unknown) {
  const parsed = toFiniteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : 0;
}

function sanitizeTransactions(rows: RawTransaction[]) {
  return rows.flatMap<AnalyticsTransactionData>((row) => {
    const id = row.id?.trim();
    const type = row.type?.trim().toLowerCase();
    const amount = positiveNumber(row.amount);
    const date = row.date?.trim() ?? "";
    if (
      row.deleted_at ||
      !id ||
      !parseDateKey(date) ||
      amount <= 0 ||
      (type !== "income" && type !== "expense" && type !== "refund")
    ) {
      return [];
    }

    const category = firstRelation(row.categories);
    const account = firstRelation(row.accounts);
    return [
      {
        id,
        type,
        amount,
        date,
        categoryId:
          category?.id?.trim() || row.category_id?.trim() || "uncategorized",
        categoryName: category?.name?.trim() || "Other",
        categoryColor: category?.color?.trim() || null,
        accountId: account?.id?.trim() || row.account_id?.trim() || null,
        accountName: account?.name?.trim() || null,
        accountType: account?.type?.trim() || null,
        sourceName: row.source_name?.trim() || null,
        personName: row.person_name?.trim() || null,
        itemName: row.item_name?.trim() || null,
      },
    ];
  });
}

function SummaryValue({
  amount,
  available,
  tone,
}: {
  amount: number;
  available: boolean;
  tone?: string;
}) {
  return (
    <p
      className={`mt-2 break-words text-xl font-bold ${tone ?? "text-text-primary"}`}
    >
      {available ? <Money amount={amount} /> : "Unavailable"}
    </p>
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<AnalyticsSearchParams>;
}) {
  const todayKey = getAppDateKey();
  const rawParams = (await searchParams) ?? {};
  const requestedPeriod =
    typeof rawParams.period === "string" ? rawParams.period : undefined;
  const allowedPeriods = new Set<ReportPeriod>([
    "week",
    "month",
    "sixMonth",
    "year",
    "custom",
  ]);
  const invalidRequestedPeriod = Boolean(
    requestedPeriod && !allowedPeriods.has(requestedPeriod as ReportPeriod),
  );
  const parsed = parseAnalyticsSearchParams(
    invalidRequestedPeriod ? { period: "month" } : rawParams,
    todayKey,
  );
  const period = parsed.selection.period as ReportPeriod;
  const range = parsed.selection.current;
  const rangeLabel = formatRangeLabel(range);
  const supabase = await createClient();

  const [
    transactionsResult,
    transfersResult,
    goalsResult,
    payablesResult,
    investmentsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount, date, category_id, account_id, source_name, person_name, item_name, deleted_at, categories(id, name, color), accounts(id, name, type)",
      )
      .is("deleted_at", null)
      .gte("date", range.start)
      .lte("date", range.end)
      .in("type", ["income", "expense", "refund"])
      .order("date", { ascending: true })
      .order("id", { ascending: true }),
    supabase
      .from("account_transfers")
      .select(
        "id, amount, deleted_at, from_account:from_account_id(id, name, type), to_account:to_account_id(id, name, type)",
      )
      .is("deleted_at", null)
      .gte("transfer_date", range.start)
      .lte("transfer_date", range.end),
    supabase.from("goals").select("id, target_amount, current_amount, status"),
    supabase
      .from("liabilities")
      .select("id, remaining_amount, due_date, status"),
    supabase
      .from("investments")
      .select("id, quantity, purchase_price, current_price"),
  ]);

  const queryResults = [
    ["transactions", transactionsResult.error],
    ["transfers", transfersResult.error],
    ["goals", goalsResult.error],
    ["payables", payablesResult.error],
    ["investments", investmentsResult.error],
  ] as const;
  queryResults.forEach(([area, error]) => {
    if (error) {
      console.error("[reports] Data query failed", {
        area,
        code: error.code ?? "unknown",
      });
    }
  });

  const financialDataAvailable = !transactionsResult.error;
  const transactions = financialDataAvailable
    ? sanitizeTransactions((transactionsResult.data ?? []) as RawTransaction[])
    : [];
  const income = sumTransactions(transactions, range, "income");
  const expenses = sumTransactions(transactions, range, "expense");
  const net = income - expenses;
  const periodFacts = calculatePeriodFacts(transactions, range);
  const cashFlow = buildCashFlowSeriesForRange(transactions, range).map(
    (point) => ({
      month: point.label,
      income: point.income,
      expenses: point.expenses,
    }),
  );
  const categories = buildExpenseCategoryBreakdown(transactions, range).map(
    (item) => ({
      name: item.name,
      amount: item.amount,
      color: item.color,
      pct: item.percentage,
    }),
  );
  const incomeSources = buildIncomeSourceSummary(transactions, range);
  const expenseAccounts = buildAccountBreakdown(transactions, range);

  const accountSummary = new Map<
    string,
    {
      id: string;
      name: string;
      income: number;
      expenses: number;
      transfersIn: number;
      transfersOut: number;
    }
  >();
  const ensureAccount = (id: string, name: string) => {
    const current = accountSummary.get(id);
    if (current) return current;
    const next = {
      id,
      name,
      income: 0,
      expenses: 0,
      transfersIn: 0,
      transfersOut: 0,
    };
    accountSummary.set(id, next);
    return next;
  };
  transactions.forEach((transaction) => {
    const id = transaction.accountId?.trim();
    if (!id) return;
    const account = ensureAccount(
      id,
      transaction.accountName?.trim() || "Unknown account",
    );
    if (transaction.type === "income") {
      account.income += positiveNumber(transaction.amount);
    }
    if (transaction.type === "expense") {
      account.expenses += positiveNumber(transaction.amount);
    }
    if (transaction.type === "refund") {
      account.expenses -= positiveNumber(transaction.amount);
    }
  });
  if (!transfersResult.error) {
    ((transfersResult.data ?? []) as RawTransfer[]).forEach((transfer) => {
      if (transfer.deleted_at) return;
      const amount = positiveNumber(transfer.amount);
      const from = firstRelation(transfer.from_account);
      const to = firstRelation(transfer.to_account);
      if (amount <= 0) return;
      if (from?.id) {
        ensureAccount(
          from.id,
          from.name?.trim() || "From account",
        ).transfersOut += amount;
      }
      if (to?.id) {
        ensureAccount(to.id, to.name?.trim() || "To account").transfersIn +=
          amount;
      }
    });
  }
  const accountRows = Array.from(accountSummary.values()).sort((left, right) => {
    const leftActivity =
      left.income + left.expenses + left.transfersIn + left.transfersOut;
    const rightActivity =
      right.income + right.expenses + right.transfersIn + right.transfersOut;
    return rightActivity - leftActivity || left.name.localeCompare(right.name);
  });

  const goalRows = goalsResult.error ? [] : (goalsResult.data ?? []);
  const goalTarget = goalRows.reduce(
    (sum, goal) => sum + positiveNumber(goal.target_amount),
    0,
  );
  const goalProgress = goalRows.reduce(
    (sum, goal) => sum + Math.max(positiveNumber(goal.current_amount), 0),
    0,
  );
  const completedGoals = goalRows.filter(
    (goal) => goal.status === "completed",
  ).length;

  const payableRows = payablesResult.error ? [] : (payablesResult.data ?? []);
  const payableRemaining = payableRows.reduce(
    (sum, payable) =>
      sum + Math.max(positiveNumber(payable.remaining_amount), 0),
    0,
  );
  const overduePayables = payableRows.filter(
    (payable) =>
      positiveNumber(payable.remaining_amount) > 0 &&
      typeof payable.due_date === "string" &&
      payable.due_date < todayKey,
  ).length;

  const investmentRows = investmentsResult.error
    ? []
    : (investmentsResult.data ?? []);
  const investmentSummary = investmentRows.reduce(
    (summary, investment) => {
      const quantity = positiveNumber(investment.quantity);
      const purchasePrice = positiveNumber(investment.purchase_price);
      const currentPrice = positiveNumber(investment.current_price);
      if (quantity <= 0 || purchasePrice <= 0) return summary;
      summary.invested += quantity * purchasePrice;
      if (currentPrice > 0) summary.current += quantity * currentPrice;
      else summary.partial = true;
      return summary;
    },
    { invested: 0, current: 0, partial: false },
  );
  const investmentPnl = investmentSummary.current - investmentSummary.invested;

  const partialAreas = queryResults
    .filter(([, error]) => Boolean(error))
    .map(([area]) => area);
  const entryCount = periodFacts.incomeCount + periodFacts.expenseCount;
  const refundCount = transactions.filter(
    (transaction) => transaction.type === "refund",
  ).length;
  const transferCount = transfersResult.error
    ? null
    : transfersResult.data?.length ?? 0;

  return (
    <div
      data-print-report
      data-reports-page
      className="space-y-5 pb-8 print:space-y-4 print:pb-0"
    >
      <div className="page-heading finance-surface-glass overflow-hidden print:border-none print:bg-white print:shadow-none">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="page-title">Reports</h2>
            {financialDataAvailable ? (
              <span className="finance-status-success rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                Ready
              </span>
            ) : null}
          </div>
          <p className="page-subtitle">
            {rangeLabel} · {entryCount} income and expense{" "}
            {entryCount === 1 ? "entry" : "entries"}
            {refundCount > 0
              ? ` · ${refundCount} ${refundCount === 1 ? "refund" : "refunds"}`
              : ""}
            {transferCount === null
              ? ""
              : ` · ${transferCount} ${transferCount === 1 ? "transfer" : "transfers"}`}
          </p>
        </div>
        <div className="print:hidden">
          <ExportButton from={range.start} to={range.end} />
        </div>
      </div>

      <Suspense fallback={<div className="finance-panel h-24 print:hidden" />}>
        <ReportRangeControls
          period={period}
          start={range.start}
          end={range.end}
        />
      </Suspense>

      {parsed.wasReset || invalidRequestedPeriod ? (
        <InlineNotice tone="warning" role="status" className="print:hidden">
          The requested report range was invalid, so the current month was loaded
          instead.
        </InlineNotice>
      ) : null}

      {!financialDataAvailable ? (
        <InlineNotice tone="danger" role="alert">
          This report could not be prepared. Check your connection and try again;
          saved records were not changed.
        </InlineNotice>
      ) : partialAreas.length > 0 ? (
        <InlineNotice tone="warning" role="status">
          Report prepared with partial data. Unavailable sections:{" "}
          {partialAreas.join(", ")}.
        </InlineNotice>
      ) : null}

      <div
        data-mobile-summary-grid
        data-report-summary
        className="grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        <article className="summary-card min-w-0">
          <div className="flex items-center gap-2 text-success">
            <TrendingUp aria-hidden="true" size={16} strokeWidth={2.35} />
            <p className="text-xs font-semibold text-text-secondary">Income</p>
          </div>
          <SummaryValue
            amount={income}
            available={financialDataAvailable}
            tone="text-success"
          />
        </article>
        <article className="summary-card min-w-0">
          <div className="flex items-center gap-2 text-danger">
            <TrendingDown aria-hidden="true" size={16} strokeWidth={2.35} />
            <p className="text-xs font-semibold text-text-secondary">Expenses</p>
          </div>
          <SummaryValue
            amount={expenses}
            available={financialDataAvailable}
            tone="text-danger"
          />
        </article>
        <article className="summary-card min-w-0">
          <div className="flex items-center gap-2 text-active">
            <Scale aria-hidden="true" size={16} strokeWidth={2.35} />
            <p className="text-xs font-semibold text-text-secondary">Net result</p>
          </div>
          <SummaryValue
            amount={net}
            available={financialDataAvailable}
            tone={net < 0 ? "text-danger" : "text-active"}
          />
        </article>
        <article className="summary-card min-w-0">
          <div className="flex items-center gap-2 text-info">
            <Activity aria-hidden="true" size={16} strokeWidth={2.35} />
            <p className="text-xs font-semibold text-text-secondary">
              Daily averages
            </p>
          </div>
          <p className="mt-2 text-sm font-bold text-text-primary">
            {financialDataAvailable ? (
              <Money amount={periodFacts.averageDailySpending} />
            ) : (
              "Unavailable"
            )}
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            spending per day · {periodFacts.inclusiveDays} days
          </p>
        </article>
      </div>

      {financialDataAvailable && entryCount === 0 && transferCount === 0 ? (
        <div className="finance-panel p-5 text-center sm:p-7">
          <FileBarChart
            aria-hidden="true"
            className="mx-auto size-8 text-text-secondary"
          />
          <h2 className="mt-3 text-sm font-semibold text-text-primary">
            No report activity in this range
          </h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Choose another period or add financial activity. No values have been
            invented.
          </p>
        </div>
      ) : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
        <MonthlyChart data={cashFlow} title={`Cash flow · ${rangeLabel}`} />
        <CategoryBreakdown data={categories} title="Expense categories" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="finance-panel min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp
              aria-hidden="true"
              size={16}
              strokeWidth={2.35}
              className="text-success"
            />
            <h2 className="text-sm font-semibold text-text-primary">
              Income sources
            </h2>
          </div>
          {incomeSources.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">
              No income sources in this range.
            </p>
          ) : (
            <div className="space-y-3">
              {incomeSources.items.slice(0, 8).map((source) => (
                <div
                  key={source.id}
                  className="finance-panel-soft flex min-w-0 items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">
                      {source.name}
                    </p>
                    <p className="mt-0.5 text-xs text-text-secondary">
                      {source.percentage.toFixed(1)}% of income
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-success">
                    <Money amount={source.amount} />
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="finance-panel min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <WalletCards
              aria-hidden="true"
              size={16}
              strokeWidth={2.35}
              className="text-info"
            />
            <h2 className="text-sm font-semibold text-text-primary">
              Account activity
            </h2>
          </div>
          {accountRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">
              No account activity in this range.
            </p>
          ) : (
            <div className="space-y-3">
              {accountRows.slice(0, 8).map((account) => (
                <article
                  key={account.id}
                  className="finance-panel-soft min-w-0 p-3"
                >
                  <p className="truncate text-sm font-semibold text-text-primary">
                    {account.name}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs sm:grid-cols-4">
                    <span className="text-success">
                      In <Money amount={account.income} />
                    </span>
                    <span className="text-danger">
                      Out <Money amount={account.expenses} />
                    </span>
                    <span className="text-info">
                      Transfer in <Money amount={account.transfersIn} />
                    </span>
                    <span className="text-info">
                      Transfer out <Money amount={account.transfersOut} />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
          {expenseAccounts.length > 0 ? (
            <p className="mt-3 text-xs text-text-secondary">
              Highest spending account: {expenseAccounts[0].name} (
              {expenseAccounts[0].percentage.toFixed(1)}%).
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="finance-panel min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-goals">
            <Target aria-hidden="true" size={17} strokeWidth={2.35} />
            <h2 className="text-sm font-semibold text-text-primary">
              Goals overview
            </h2>
          </div>
          {goalsResult.error ? (
            <p className="mt-5 text-sm text-text-secondary">
              Goal data unavailable.
            </p>
          ) : (
            <>
              <p className="mt-5 text-xl font-bold text-text-primary">
                <Money amount={goalProgress} />
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                toward <Money amount={goalTarget} />
              </p>
              <p className="mt-3 text-xs font-semibold text-goals">
                {completedGoals} of {goalRows.length} completed
              </p>
            </>
          )}
        </section>

        <section className="finance-panel min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-payables">
            <CreditCard aria-hidden="true" size={17} strokeWidth={2.35} />
            <h2 className="text-sm font-semibold text-text-primary">
              Payables overview
            </h2>
          </div>
          {payablesResult.error ? (
            <p className="mt-5 text-sm text-text-secondary">
              Payable data unavailable.
            </p>
          ) : (
            <>
              <p className="mt-5 text-xl font-bold text-payables">
                <Money amount={payableRemaining} />
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                remaining across {payableRows.length} payables
              </p>
              <p
                className={`mt-3 text-xs font-semibold ${
                  overduePayables > 0 ? "text-danger" : "text-success"
                }`}
              >
                {overduePayables} overdue
              </p>
            </>
          )}
        </section>

        <section className="finance-panel min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-investment">
            <CircleDollarSign
              aria-hidden="true"
              size={17}
              strokeWidth={2.35}
            />
            <h2 className="text-sm font-semibold text-text-primary">
              Investment overview
            </h2>
          </div>
          {investmentsResult.error ? (
            <p className="mt-5 text-sm text-text-secondary">
              Investment data unavailable.
            </p>
          ) : (
            <>
              <p className="mt-5 text-xl font-bold text-investment">
                <Money amount={investmentSummary.current} />
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                current value · invested{" "}
                <Money amount={investmentSummary.invested} />
              </p>
              {investmentSummary.partial ? (
                <p className="mt-3 text-xs font-semibold text-warning">
                  Market result unavailable · partial pricing
                </p>
              ) : (
                <p
                  className={`mt-3 text-xs font-semibold ${
                    investmentPnl > 0
                      ? "text-success"
                      : investmentPnl < 0
                        ? "text-danger"
                        : "text-text-secondary"
                  }`}
                >
                  Market{" "}
                  {investmentPnl > 0
                    ? "gain"
                    : investmentPnl < 0
                      ? "loss"
                      : "change"}
                  : <Money amount={Math.abs(investmentPnl)} />
                </p>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
