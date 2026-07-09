import { createClient } from "@/lib/supabase/server";
import MetricCard from "@/components/dashboard/MetricCard";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import GoalsProgress from "@/components/dashboard/GoalsProgress";
import FinancePulseCard from "@/components/dashboard/FinancePulseCard";
import InvestmentOverviewWidget from "@/components/dashboard/InvestmentOverviewWidget";
import SpendRecordWidget from "@/components/dashboard/SpendRecordWidget";
import ChartCard from "@/components/dashboard/ChartCard";
import QuickActionsBalance from "@/components/dashboard/QuickActionsBalance";
import NewUserSetupGuide from "@/components/dashboard/NewUserSetupGuide";
import {
  aggregateInvestmentHoldings,
  getAggregatedPortfolioTotals,
} from "@/lib/investments/aggregation";
import { refreshInvestmentMarketPrices } from "@/lib/investments/pricing";
import { sortTransactionsNewestFirst } from "@/lib/transactions";
import {
  formatAppMonth,
  formatAppMonthYear,
  formatDateKey,
  getAppDateKey,
  getAppMonthRange,
  normalizeDateKey,
} from "@/lib/dates";
import {
  DashboardMotion,
  DashboardMotionItem,
} from "@/components/dashboard/DashboardMotion";
import { AlertTriangle, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

type DashboardTransaction = {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number | string;
  note: string | null;
  date: string;
  created_at?: string | null;
  categories: {
    id: string;
    name: string;
    color: string | null;
    parent?: { name: string } | null;
  } | null;
  accounts: { name: string } | null;
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

type SetupCounts = {
  accounts: number;
  incomeTransactions: number;
  expenseTransactions: number;
  incomeCategories: number;
  expenseCategories: number;
  goals: number;
  investments: number;
};

function isDateInRange(
  value: Date | string | null | undefined,
  start: string,
  end: string,
) {
  const dateKey = normalizeDateKey(value);
  return Boolean(dateKey && dateKey >= start && dateKey <= end);
}

function isValidCategoryHex(color: string | null | undefined): color is string {
  return (
    typeof color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
  );
}

function getCategoryColor(color: string | null | undefined) {
  return isValidCategoryHex(color) ? color : "#6b7280";
}

function pct(current: number, previous: number) {
  if (previous !== 0) {
    return Number(
      (((current - previous) / Math.abs(previous)) * 100).toFixed(2),
    );
  }

  if (current > 0) return 100;
  if (current < 0) return -100;

  return 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const todayStr = getAppDateKey(now);
  const {
    year,
    month,
    day: dayOfMonth,
    daysInMonth,
    firstDay,
    lastDay,
    lastFirst,
    lastLast,
  } = getAppMonthRange(now);

  const [
    { data: thisTxns, error: thisTxnsError },
    { data: recentTxns, error: recentTxnsError },
    { data: lastTxns, error: lastTxnsError },
    { data: investments, error: investmentsError },
    { data: goals, error: goalsError },
    { data: accounts, error: accountsError },
    { count: setupAccountsCount, error: setupAccountsError },
    { count: setupIncomeCount, error: setupIncomeError },
    { count: setupExpenseCount, error: setupExpenseError },
    { count: setupIncomeCategoriesCount, error: setupIncomeCategoriesError },
    { count: setupExpenseCategoriesCount, error: setupExpenseCategoriesError },
    { count: setupGoalsCount, error: setupGoalsError },
    { count: setupInvestmentsCount, error: setupInvestmentsError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(id, name, color), accounts(name)")
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false }),

    supabase
      .from("transactions")
      .select("*, categories(id, name, color), accounts(name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12),

    supabase
      .from("transactions")
      .select("type, amount")
      .gte("date", lastFirst)
      .lte("date", lastLast),

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

  const setupCounts: SetupCounts = {
    accounts: setupAccountsCount ?? 0,
    incomeTransactions: setupIncomeCount ?? 0,
    expenseTransactions: setupExpenseCount ?? 0,
    incomeCategories: setupIncomeCategoriesCount ?? 0,
    expenseCategories: setupExpenseCategoriesCount ?? 0,
    goals: setupGoalsCount ?? 0,
    investments: setupInvestmentsCount ?? 0,
  };

  const dashboardErrors = [
    thisTxnsError,
    recentTxnsError,
    lastTxnsError,
    investmentsError,
    goalsError,
    accountsError,
    setupAccountsError,
    setupIncomeError,
    setupExpenseError,
    setupIncomeCategoriesError,
    setupExpenseCategoriesError,
    setupGoalsError,
    setupInvestmentsError,
  ].filter(Boolean);

  if (dashboardErrors.length > 0) {
    console.error(
      "Failed to load some dashboard data",
      dashboardErrors.map((error) => error?.message),
    );
  }

  const txns = (thisTxns ?? []) as DashboardTransaction[];
  const recentTransactions = sortTransactionsNewestFirst(
    (recentTxns ?? []) as DashboardTransaction[],
  );
  const previousTxns = (lastTxns ?? []) as Array<{
    type: string;
    amount: number | string;
  }>;
  const investmentRows = await refreshInvestmentMarketPrices(
    (investments ?? []) as DashboardInvestment[],
  );
  const groupedInvestmentRows = aggregateInvestmentHoldings(investmentRows);
  const goalRows = (goals ?? []) as DashboardGoal[];

  const accountRows = (accounts ?? []) as DashboardAccount[];

  const cashBalance = accountRows.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0,
  );
  const income = txns
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const expenses = txns
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const netProfit = income - expenses;

  const investmentTotals = getAggregatedPortfolioTotals(groupedInvestmentRows);
  const investmentsValue = investmentTotals.totalValue;
  const totalNetBalance = cashBalance + investmentsValue;

  const monthlyInvestmentsValue = investmentRows
    .filter((investment) =>
      isDateInRange(investment.purchased_at, firstDay, lastDay),
    )
    .reduce(
      (sum, investment) =>
        sum + Number(investment.quantity) * Number(investment.purchase_price),
      0,
    );

  const previousMonthlyInvestmentsValue = investmentRows
    .filter((investment) =>
      isDateInRange(investment.purchased_at, lastFirst, lastLast),
    )
    .reduce(
      (sum, investment) =>
        sum + Number(investment.quantity) * Number(investment.purchase_price),
      0,
    );

  const totalPnLPct = investmentTotals.totalPnLPct;

  const lastIncome = previousTxns
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const lastExpenses = previousTxns
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const lastNetProfit = lastIncome - lastExpenses;

  const dailyTotals = new Map<string, { income: number; expenses: number }>();

  txns.forEach((transaction) => {
    const dateKey = normalizeDateKey(transaction.date);

    if (!dateKey) return;

    const current = dailyTotals.get(dateKey) ?? {
      income: 0,
      expenses: 0,
    };

    if (transaction.type === "income") {
      current.income += Number(transaction.amount);
    }

    if (transaction.type === "expense") {
      current.expenses += Number(transaction.amount);
    }

    dailyTotals.set(dateKey, current);
  });

  const todayTotals = dailyTotals.get(todayStr) ?? {
    income: 0,
    expenses: 0,
  };

  const netToday = todayTotals.income - todayTotals.expenses;

  const netTodayTone =
    netToday > 0 ? "positive"
    : netToday < 0 ? "negative"
    : "neutral";

  const chartData = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const dateStr = formatDateKey(year, month, day);

    const totals = dailyTotals.get(dateStr);

    return {
      date: `${day} ${formatAppMonth(year, month)}`,
      income: totals?.income ?? 0,
      expenses: totals?.expenses ?? 0,
    };
  });

  const categoryMap = new Map<
    string,
    { id: string; name: string; amount: number; color: string }
  >();

  txns
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const categoryId = transaction.categories?.id;
      const key = categoryId ?? "uncategorized";
      const name = transaction.categories?.name || "Other";
      const color = getCategoryColor(transaction.categories?.color);

      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          id: key,
          name,
          amount: 0,
          color,
        });
      }

      const current = categoryMap.get(key);
      if (current) current.amount += Number(transaction.amount);
    });

  const spendingData = Array.from(categoryMap.values())
    .map(({ id, name, amount, color }) => ({
      id,
      name,
      value: amount,
      color,
      percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const currentMonthLabel = formatAppMonthYear(year, month);

  const dailySpend = expenses / Math.max(dayOfMonth, 1);
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const dailyExpenseTrend = chartData.map((day) => day.expenses);

  return (
    <DashboardMotion className="w-full space-y-6 pb-12">
      {dashboardErrors.length > 0 ? (
        <DashboardMotionItem>
          <div className="finance-panel border-warning/30 bg-warning/10 p-4 text-sm text-text-primary">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div>
                <p className="font-semibold">Some dashboard data could not be loaded.</p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Refresh the page or try again after checking your connection.
                </p>
              </div>
            </div>
          </div>
        </DashboardMotionItem>
      ) : null}

      <DashboardMotionItem>
        <QuickActionsBalance totalBalance={totalNetBalance} />
      </DashboardMotionItem>

      <DashboardMotionItem>
        <NewUserSetupGuide counts={setupCounts} />
      </DashboardMotionItem>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMotionItem>
          <MetricCard
            title="Month Balance"
            subtitle={currentMonthLabel}
            amount={netProfit}
            change={pct(netProfit, lastNetProfit)}
            iconName="wallet"
            accentColor="#3b82f6"
            progress={62}
          />
        </DashboardMotionItem>

        <DashboardMotionItem>
          <MetricCard
            title="Monthly Income"
            subtitle={currentMonthLabel}
            amount={income}
            change={pct(income, lastIncome)}
            iconName="income"
            accentColor="#22c55e"
            progress={64}
          />
        </DashboardMotionItem>

        <DashboardMotionItem>
          <MetricCard
            title="Monthly Expenses"
            subtitle={currentMonthLabel}
            amount={expenses}
            change={pct(expenses, lastExpenses)}
            iconName="expenses"
            accentColor="#ef4444"
            progress={38}
          />
        </DashboardMotionItem>

        <DashboardMotionItem>
          <MetricCard
            title="Investments This Month"
            subtitle={currentMonthLabel}
            amount={monthlyInvestmentsValue}
            change={pct(
              monthlyInvestmentsValue,
              previousMonthlyInvestmentsValue,
            )}
            iconName="investments"
            accentColor="#f59e0b"
            progress={68}
          />
        </DashboardMotionItem>
      </div>

      <DashboardMotionItem>
        <FinancePulseCard
          income={todayTotals.income}
          expenses={todayTotals.expenses}
          net={netToday}
          netTone={netTodayTone}
          remainingDays={remainingDays}
        />
      </DashboardMotionItem>

      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardMotionItem className="min-w-0">
          <SpendRecordWidget
            monthlySpend={expenses}
            dailySpend={dailySpend}
            dailyExpenseTrend={dailyExpenseTrend}
          />
        </DashboardMotionItem>

        <DashboardMotionItem className="min-w-0">
          {investmentRows.length > 0 ?
            <InvestmentOverviewWidget
              investments={investmentRows}
              totalPnLPct={totalPnLPct}
            />
          : <ChartCard
              eyebrow="Investments"
              eyebrowIcon={<Zap />}
              title="Portfolio Overview"
              description="Allocation by current value"
            >
              <div className="dashboard-chart-empty min-h-[132px]">
                <div>
                  <span className="dashboard-chart-empty-icon">
                    <Zap size={16} />
                  </span>
                  <p className="text-xs font-semibold text-text-primary">
                    No holdings yet
                  </p>
                  <p className="mt-1 text-[11px] text-text-secondary">
                    Add investments to see allocation.
                  </p>
                </div>
              </div>
            </ChartCard>
          }
        </DashboardMotionItem>

        <DashboardMotionItem className="min-w-0">
          <IncomeExpenseChart data={chartData} />
        </DashboardMotionItem>
      </div>

      <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <DashboardMotionItem className="h-full min-w-0">
          <SpendingBreakdown
            data={spendingData}
            total={expenses}
            periodLabel={currentMonthLabel}
          />
        </DashboardMotionItem>

        <DashboardMotionItem className="h-full min-w-0">
          <GoalsProgress goals={goalRows} maxVisible={4} />
        </DashboardMotionItem>

        <DashboardMotionItem className="h-full min-w-0">
          <RecentTransactions transactions={recentTransactions} />
        </DashboardMotionItem>
      </div>
    </DashboardMotion>
  );
}
