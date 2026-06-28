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
import { Zap } from "lucide-react";

export const dynamic = "force-dynamic";

type DashboardTransaction = {
  id: string;
  type: "income" | "expense" | "transfer" | string;
  amount: number | string;
  note: string | null;
  date: string;
  categories: {
    name: string;
    color: string;
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
};

type DashboardGoal = {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  icon: string | null;
};

function isDateInRange(
  value: Date | string | null | undefined,
  start: string,
  end: string,
) {
  const dateKey = normalizeDateKey(value);
  return Boolean(dateKey && dateKey >= start && dateKey <= end);
}

function fmt(value: number) {
  return `PKR ${value.toLocaleString("en-PK", {
    maximumFractionDigits: 0,
  })}`;
}
function fmtBalance(value: number) {
  return `PKR ${value.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
    { data: thisTxns },
    { data: recentTxns },
    { data: lastTxns },
    { data: investments },
    { data: goals },
    { data: accounts },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(name, color), accounts(name)")
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false }),

    supabase
      .from("transactions")
      .select("*, categories(name, color), accounts(name)")
      .order("date", { ascending: false })
      .limit(12),

    supabase
      .from("transactions")
      .select("type, amount")
      .gte("date", lastFirst)
      .lte("date", lastLast),

    supabase
      .from("investments")
      .select(
        "id, name, type, quantity, purchase_price, current_price, purchased_at",
      )
      .order("created_at", { ascending: false }),

    supabase.from("goals").select("*").order("created_at").limit(6),
    supabase.from("accounts").select("id, balance"),
  ]);

  const txns = (thisTxns ?? []) as DashboardTransaction[];
  const recentTransactions = (recentTxns ?? []) as DashboardTransaction[];
  const previousTxns = (lastTxns ?? []) as Array<{
    type: string;
    amount: number | string;
  }>;
  const investmentRows = (investments ?? []) as DashboardInvestment[];
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

  const investmentsValue = investmentRows.reduce(
    (sum, investment) =>
      sum + Number(investment.current_price) * Number(investment.quantity),
    0,
  );
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

  const totalInvested = investmentRows.reduce(
    (sum, investment) =>
      sum + Number(investment.quantity) * Number(investment.purchase_price),
    0,
  );

  const totalPnL = investmentsValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

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

  const categoryMap: Record<string, { amount: number; color: string }> = {};

  txns
    .filter((transaction) => transaction.type === "expense")
    .forEach((transaction) => {
      const name = transaction.categories?.name || "Other";
      const color = transaction.categories?.color || "#6b7280";

      if (!categoryMap[name]) {
        categoryMap[name] = {
          amount: 0,
          color,
        };
      }

      categoryMap[name].amount += Number(transaction.amount);
    });

  const spendingData = Object.entries(categoryMap)
    .map(([name, { amount, color }]) => ({
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
      <DashboardMotionItem>
        <QuickActionsBalance totalBalance={fmtBalance(totalNetBalance)} />
      </DashboardMotionItem>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardMotionItem>
          <MetricCard
            title="Month Balance"
            subtitle={currentMonthLabel}
            amount={fmt(netProfit)}
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
            amount={fmt(income)}
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
            amount={fmt(expenses)}
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
            amount={fmt(monthlyInvestmentsValue)}
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
          income={fmt(todayTotals.income)}
          expenses={fmt(todayTotals.expenses)}
          net={fmt(netToday)}
          netTone={netTodayTone}
          remainingDays={remainingDays}
        />
      </DashboardMotionItem>

      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardMotionItem className="min-w-0">
          <SpendRecordWidget
            monthlySpend={fmt(expenses)}
            dailySpend={fmt(dailySpend)}
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
