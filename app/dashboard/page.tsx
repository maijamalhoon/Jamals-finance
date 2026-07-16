import FinancePulseCard from "@/components/dashboard/FinancePulseCard";
import GoalsProgress from "@/components/dashboard/GoalsProgress";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import InvestmentOverviewWidget from "@/components/dashboard/InvestmentOverviewWidget";
import MetricCard from "@/components/dashboard/MetricCard";
import NewUserSetupGuide from "@/components/dashboard/NewUserSetupGuide";
import QuickActionsBalance from "@/components/dashboard/QuickActionsBalance";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown";
import SpendRecordWidget from "@/components/dashboard/SpendRecordWidget";
import {
  DashboardMotion,
  DashboardMotionItem,
} from "@/components/dashboard/DashboardMotion";
import {
  buildDashboardBalanceSummary,
  buildDashboardCashFlow,
  buildDashboardSpendingBreakdown,
  calculateDashboardPricedPortfolio,
  calculateDashboardTransactionSnapshot,
  calculateInvestmentContributions,
  getDashboardPeriodRanges,
  inspectDashboardInvestmentQuality,
  resolveDashboardSetupCounts,
  sanitizeDashboardTransactions,
  sumDashboardAccountBalances,
  type DashboardAvailability,
  type DashboardTransactionInput,
} from "@/lib/dashboard-financial-semantics";
import { formatAppMonthYear, getAppDateKey, getAppDateParts, getDaysInMonth } from "@/lib/dates";
import { refreshInvestmentMarketPrices } from "@/lib/investments/pricing";
import { createClient } from "@/lib/supabase/server";
import { sortTransactionsNewestFirst } from "@/lib/transactions";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

type DashboardCategory = {
  id?: string | null;
  name?: string | null;
  color?: string | null;
  parent?: { name?: string | null } | null;
};

type DashboardAccountRelation = { name?: string | null };

type DashboardTransaction = {
  id?: string | null;
  type?: string | null;
  amount?: number | string | null;
  note?: string | null;
  date?: string | null;
  created_at?: string | null;
  category_id?: string | null;
  account_id?: string | null;
  source_name?: string | null;
  person_name?: string | null;
  item_name?: string | null;
  categories?: DashboardCategory | DashboardCategory[] | null;
  accounts?: DashboardAccountRelation | DashboardAccountRelation[] | null;
};

type DashboardAccount = {
  id: string;
  balance: number | string | null;
};

type DashboardInvestment = {
  id: string;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
  purchased_at?: string | null;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
};

type DashboardGoal = {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  icon: string | null;
};

type QueryError = { code?: string | null } | null;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function toTransactionInput(row: DashboardTransaction): DashboardTransactionInput {
  const category = firstRelation(row.categories);
  const account = firstRelation(row.accounts);
  return {
    id: row.id,
    amount: row.amount,
    date: row.date,
    type: row.type,
    categoryId: category?.id ?? row.category_id,
    categoryName: category?.name,
    categoryColor: category?.color,
    accountId: row.account_id,
    accountName: account?.name,
    sourceName: row.source_name,
    personName: row.person_name,
    itemName: row.item_name,
  };
}

function logQueryFailure(area: string, error: QueryError) {
  if (!error) return;
  console.error("[dashboard] Data query failed", {
    area,
    code: error.code ?? "unknown",
  });
}

function pluralizedIssue(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const todayKey = getAppDateKey(now);
  const { year, month, day } = getAppDateParts(now);
  const daysInMonth = getDaysInMonth(year, month);
  const ranges = getDashboardPeriodRanges(todayKey);

  const [
    transactionsResult,
    recentResult,
    investmentsResult,
    goalsResult,
    accountsResult,
    setupAccountsResult,
    setupIncomeResult,
    setupExpenseResult,
    setupIncomeCategoriesResult,
    setupExpenseCategoriesResult,
    setupGoalsResult,
    setupInvestmentsResult,
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, type, amount, note, date, created_at, category_id, account_id, source_name, person_name, item_name, categories(id, name, color), accounts(name)",
      )
      .gte("date", ranges.query.start)
      .lte("date", ranges.query.end)
      .order("date", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select(
        "id, type, amount, note, date, created_at, source_name, person_name, item_name, categories(id, name, color), accounts(name)",
      )
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("investments")
      .select(
        "id, name, type, quantity, purchase_price, current_price, purchased_at, asset_id, symbol, image_url, price_source, current_price_original, current_price_currency, price_updated_at, price_change_24h, is_live_priced",
      )
      .order("created_at", { ascending: false }),
    supabase.from("goals").select("*").order("created_at").limit(6),
    supabase.from("accounts").select("id, balance"),
    supabase.from("accounts").select("id", { count: "exact", head: true }),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "income"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("type", "expense"),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("type", "income"),
    supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("type", "expense"),
    supabase.from("goals").select("id", { count: "exact", head: true }),
    supabase.from("investments").select("id", { count: "exact", head: true }),
  ]);

  const queryFailures: Array<[string, QueryError]> = [
    ["period-transactions", transactionsResult.error],
    ["recent-activity", recentResult.error],
    ["investments", investmentsResult.error],
    ["goals", goalsResult.error],
    ["accounts", accountsResult.error],
    ["setup-accounts", setupAccountsResult.error],
    ["setup-income", setupIncomeResult.error],
    ["setup-expenses", setupExpenseResult.error],
    ["setup-income-categories", setupIncomeCategoriesResult.error],
    ["setup-expense-categories", setupExpenseCategoriesResult.error],
    ["setup-goals", setupGoalsResult.error],
    ["setup-investments", setupInvestmentsResult.error],
  ];
  queryFailures.forEach(([area, error]) => logQueryFailure(area, error));

  const transactionsStatus: DashboardAvailability =
    transactionsResult.error ? "unavailable" : "available";
  const recentStatus: DashboardAvailability =
    recentResult.error ? "unavailable" : "available";
  const goalsStatus: DashboardAvailability =
    goalsResult.error ? "unavailable" : "available";

  const rawPeriodTransactions = (transactionsResult.data ?? []) as DashboardTransaction[];
  const financialTransactions =
    transactionsStatus === "available" ?
      sanitizeDashboardTransactions(
        rawPeriodTransactions.map(toTransactionInput),
        ranges.query,
      )
    : [];
  const transactionSnapshot = calculateDashboardTransactionSnapshot(
    financialTransactions,
    ranges,
  );
  const cashFlow = buildDashboardCashFlow(financialTransactions, ranges.current);
  const spending = buildDashboardSpendingBreakdown(
    financialTransactions,
    ranges.current,
  );
  const today = cashFlow.find((point) => point.dateKey === todayKey) ?? {
    income: 0,
    expenses: 0,
  };
  const todayNet = today.income - today.expenses;
  const todayNetTone =
    todayNet > 0 ? "positive"
    : todayNet < 0 ? "negative"
    : "neutral";

  const rawInvestments = (investmentsResult.data ?? []) as DashboardInvestment[];
  const investmentRows =
    investmentsResult.error ? [] : await refreshInvestmentMarketPrices(rawInvestments);
  const investmentQuality = inspectDashboardInvestmentQuality(
    investmentRows.map((investment) => ({
      quantity: investment.quantity,
      purchasePrice: investment.purchase_price,
      currentPrice: investment.current_price,
    })),
  );
  const investmentTotals = calculateDashboardPricedPortfolio(
    investmentRows.map((investment) => ({
      quantity: investment.quantity,
      purchasePrice: investment.purchase_price,
      currentPrice: investment.current_price,
    })),
  );
  const investmentContribution = calculateInvestmentContributions(
    investmentRows.map((investment) => ({
      quantity: investment.quantity,
      purchasePrice: investment.purchase_price,
      purchasedAt: investment.purchased_at,
    })),
    ranges,
  );
  const investmentsStatus: DashboardAvailability =
    investmentsResult.error ? "unavailable"
    : investmentQuality.invalidCount > 0 || investmentQuality.unpricedCount > 0 ? "partial"
    : "available";
  const contributionStatus: DashboardAvailability =
    investmentsResult.error ? "unavailable"
    : investmentQuality.invalidCount > 0 ? "partial"
    : "available";

  const accountRows = (accountsResult.data ?? []) as DashboardAccount[];
  const accountSummary = sumDashboardAccountBalances(
    accountRows.map((account) => account.balance),
  );
  const accountsStatus: DashboardAvailability =
    accountsResult.error ? "unavailable"
    : accountSummary.invalidCount > 0 ? "partial"
    : "available";

  const investmentIssues = [
    investmentQuality.unpricedCount > 0 ?
      `${pluralizedIssue(investmentQuality.unpricedCount, "holding has", "holdings have")} no usable current price.`
    : null,
    investmentQuality.invalidCount > 0 ?
      `${pluralizedIssue(investmentQuality.invalidCount, "investment row was", "investment rows were")} excluded because its values were malformed.`
    : null,
  ].filter((issue): issue is string => Boolean(issue));

  const balanceSummary = buildDashboardBalanceSummary({
    accounts: {
      status: accountsStatus,
      value: accountsResult.error ? null : accountSummary.value,
      issue:
        accountsResult.error ? "Account balances could not be included."
        : accountSummary.invalidCount > 0 ?
          `${pluralizedIssue(accountSummary.invalidCount, "account balance was", "account balances were")} excluded because it was malformed.`
        : null,
    },
    investments: {
      status: investmentsStatus,
      value: investmentsResult.error ? null : investmentTotals.totalValue,
      issue:
        investmentsResult.error ? "Investment values could not be included."
        : investmentIssues.join(" ") || null,
    },
  });

  const setupResults = [
    setupAccountsResult,
    setupIncomeResult,
    setupExpenseResult,
    setupIncomeCategoriesResult,
    setupExpenseCategoriesResult,
    setupGoalsResult,
    setupInvestmentsResult,
  ];
  const setupStatus: DashboardAvailability =
    setupResults.some((result) => result.error) ? "unavailable" : "available";
  const setupCounts = resolveDashboardSetupCounts(setupStatus, {
    accounts: setupAccountsResult.count,
    incomeTransactions: setupIncomeResult.count,
    expenseTransactions: setupExpenseResult.count,
    incomeCategories: setupIncomeCategoriesResult.count,
    expenseCategories: setupExpenseCategoriesResult.count,
    goals: setupGoalsResult.count,
    investments: setupInvestmentsResult.count,
  });

  const recentTransactions = sortTransactionsNewestFirst(
    ((recentResult.data ?? []) as DashboardTransaction[]).flatMap((row) => {
      const id = row.id?.trim();
      const type = row.type?.trim().toLowerCase();
      if (!id || (type !== "income" && type !== "expense" && type !== "transfer")) {
        return [];
      }
      const category = firstRelation(row.categories);
      const account = firstRelation(row.accounts);
      return [{
        id,
        type,
        amount: row.amount ?? null,
        note: row.note ?? null,
        date: row.date ?? "",
        created_at: row.created_at ?? null,
        source_name: row.source_name ?? null,
        person_name: row.person_name ?? null,
        item_name: row.item_name ?? null,
        categories: category ? {
          name: category.name?.trim() || "Other",
          color: category.color ?? null,
          parent: category.parent?.name ? { name: category.parent.name } : null,
        } : null,
        accounts: account?.name ? { name: account.name } : null,
      }];
    }),
  );

  const warnings = [
    transactionsResult.error ?
      "Month comparisons, cash flow, spending, and today’s activity are unavailable."
    : null,
    recentResult.error ? "Recent activity is unavailable." : null,
    accountsResult.error ? "Account balances could not be loaded." : null,
    investmentsResult.error ? "Investment values and contributions could not be loaded." : null,
    goalsResult.error ? "Goals could not be loaded." : null,
    setupStatus === "unavailable" ? "Setup progress is deferred until its counts can be checked." : null,
  ].filter((warning): warning is string => Boolean(warning));

  const currentMonthLabel = formatAppMonthYear(year, month);
  const dailySpend =
    transactionSnapshot.current.expenses / Math.max(cashFlow.length, 1);
  const remainingDays = Math.max(daysInMonth - day, 0);

  return (
    <DashboardMotion className="dashboard-overview w-full space-y-6 pb-12">
      {warnings.length > 0 ? (
        <DashboardMotionItem>
          <aside
            aria-live="polite"
            className="dashboard-data-notice"
            role="status"
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-text-primary">
                Some dashboard data is temporarily unavailable
              </h2>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-5 text-text-secondary">
                {warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
              <p className="mt-2 text-xs leading-5 text-text-secondary">
                Refresh when your connection is stable. Available sections can still be used.
              </p>
            </div>
          </aside>
        </DashboardMotionItem>
      ) : null}

      <DashboardMotionItem>
        <QuickActionsBalance summary={balanceSummary} />
      </DashboardMotionItem>

      {setupCounts ? (
        <DashboardMotionItem>
          <NewUserSetupGuide counts={setupCounts} />
        </DashboardMotionItem>
      ) : null}

      <section aria-label="Month-to-date financial metrics" className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <h2 className="sr-only">Month-to-date financial metrics</h2>
        <DashboardMotionItem>
          <MetricCard
            accentColor="var(--primary)"
            amount={transactionsStatus === "available" ? transactionSnapshot.current.netSavings : null}
            availability={transactionsStatus}
            comparison={transactionsStatus === "available" ? transactionSnapshot.comparisons.netSavings : null}
            iconName="wallet"
            subtitle={currentMonthLabel}
            title="Net savings"
          />
        </DashboardMotionItem>
        <DashboardMotionItem>
          <MetricCard
            accentColor="var(--income)"
            amount={transactionsStatus === "available" ? transactionSnapshot.current.income : null}
            availability={transactionsStatus}
            comparison={transactionsStatus === "available" ? transactionSnapshot.comparisons.income : null}
            iconName="income"
            subtitle={currentMonthLabel}
            title="Month-to-date income"
          />
        </DashboardMotionItem>
        <DashboardMotionItem>
          <MetricCard
            accentColor="var(--expense)"
            amount={transactionsStatus === "available" ? transactionSnapshot.current.expenses : null}
            availability={transactionsStatus}
            comparison={transactionsStatus === "available" ? transactionSnapshot.comparisons.expenses : null}
            iconName="expenses"
            subtitle={currentMonthLabel}
            title="Month-to-date expenses"
          />
        </DashboardMotionItem>
        <DashboardMotionItem>
          <MetricCard
            accentColor="var(--investment)"
            amount={contributionStatus === "unavailable" ? null : investmentContribution.current}
            availability={contributionStatus}
            comparison={contributionStatus === "available" ? investmentContribution.comparison : null}
            iconName="investments"
            subtitle={currentMonthLabel}
            title="Investment contributions"
          />
        </DashboardMotionItem>
      </section>

      <DashboardMotionItem>
        <FinancePulseCard
          expenses={transactionsStatus === "available" ? today.expenses : null}
          income={transactionsStatus === "available" ? today.income : null}
          net={transactionsStatus === "available" ? todayNet : null}
          netTone={todayNetTone}
          remainingDays={remainingDays}
          status={transactionsStatus}
        />
      </DashboardMotionItem>

      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardMotionItem className="min-w-0">
          <SpendRecordWidget
            dailyExpenseTrend={cashFlow.map((point) => point.expenses)}
            dailySpend={transactionsStatus === "available" ? dailySpend : null}
            monthlySpend={transactionsStatus === "available" ? transactionSnapshot.current.expenses : null}
            status={transactionsStatus}
          />
        </DashboardMotionItem>
        <DashboardMotionItem className="min-w-0">
          <InvestmentOverviewWidget
            availability={investmentsStatus}
            investments={investmentRows}
            totalPnLPct={investmentTotals.totalPnLPct}
            unpricedCount={investmentQuality.unpricedCount}
          />
        </DashboardMotionItem>
        <DashboardMotionItem className="min-w-0">
          <IncomeExpenseChart data={cashFlow} status={transactionsStatus} />
        </DashboardMotionItem>
      </div>

      <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <DashboardMotionItem className="h-full min-w-0">
          <SpendingBreakdown
            data={spending.data}
            periodLabel={currentMonthLabel}
            status={transactionsStatus}
            total={spending.total}
          />
        </DashboardMotionItem>
        <DashboardMotionItem className="h-full min-w-0">
          <GoalsProgress
            goals={(goalsResult.data ?? []) as DashboardGoal[]}
            maxVisible={4}
            status={goalsStatus}
          />
        </DashboardMotionItem>
        <DashboardMotionItem className="h-full min-w-0">
          <RecentTransactions
            status={recentStatus}
            transactions={recentTransactions}
          />
        </DashboardMotionItem>
      </div>
    </DashboardMotion>
  );
}
