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

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeDateKey(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) return toLocalDateKey(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : toLocalDateKey(parsed);
}

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

function pct(current: number, previous: number) {
  if (previous > 0) {
    return Number((((current - previous) / previous) * 100).toFixed(2));
  }

  return current > 0 ? 100 : 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const todayStr = toLocalDateKey(now);
  const firstDay = toLocalDateKey(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const lastDay = toLocalDateKey(
    new Date(now.getFullYear(), now.getMonth() + 1, 0),
  );
  const lastFirst = toLocalDateKey(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const lastLast = toLocalDateKey(
    new Date(now.getFullYear(), now.getMonth(), 0),
  );
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  const [
    { data: thisTxns },
    { data: recentTxns },
    { data: lastTxns },
    { data: investments },
    { data: goals },
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
  ]);

  const txns = (thisTxns ?? []) as DashboardTransaction[];
  const recentTransactions = (recentTxns ?? []) as DashboardTransaction[];
  const previousTxns = (lastTxns ?? []) as Array<{
    type: string;
    amount: number | string;
  }>;
  const investmentRows = (investments ?? []) as DashboardInvestment[];
  const goalRows = (goals ?? []) as DashboardGoal[];

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

  const monthlyInvestmentsValue = investmentRows
    .filter((investment) =>
      isDateInRange(investment.purchased_at, firstDay, lastDay),
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
    const dateStr = toLocalDateKey(
      new Date(now.getFullYear(), now.getMonth(), day),
    );
    const totals = dailyTotals.get(dateStr);

    return {
      date: `${day} ${now.toLocaleDateString("en-US", { month: "short" })}`,
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

  const dayOfMonth = now.getDate();
  const currentMonthLabel = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const dailySpend = expenses / Math.max(dayOfMonth, 1);
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const dailyExpenseTrend = chartData.map((day) => day.expenses);
  const transactionCount = txns.length;
  const savingsRate = income > 0 ? Math.max(0, (netProfit / income) * 100) : 0;

  return (
    <DashboardMotion className="jf-dashboard-cards-page w-full min-w-0 space-y-5 pb-14 sm:space-y-6 lg:space-y-7">
      <DashboardMotionItem>
        <section className="jf-dashboard-hero-card overflow-hidden rounded-[28px] border border-border/80 bg-card/80 p-4 shadow-theme backdrop-blur-xl sm:p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="jf-dashboard-eyebrow mb-3 inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-secondary px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-text-secondary">
                <Zap size={14} className="text-active" />
                Dashboard command center
              </div>
              <h1 className="text-[clamp(1.75rem,7vw,3.25rem)] font-black leading-none tracking-[-0.055em] text-text-primary">
                Your money, simplified for {currentMonthLabel}.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary sm:text-base">
                Review cash flow, daily spending, investments, goals, and recent
                activity from one responsive workspace.
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[440px] lg:grid-cols-2 xl:grid-cols-4">
              <div className="jf-dashboard-mini-stat">
                <span>Transactions</span>
                <strong>{transactionCount}</strong>
              </div>
              <div className="jf-dashboard-mini-stat">
                <span>Saving rate</span>
                <strong>{savingsRate.toFixed(0)}%</strong>
              </div>
              <div className="jf-dashboard-mini-stat">
                <span>Today net</span>
                <strong>{fmt(netToday)}</strong>
              </div>
              <div className="jf-dashboard-mini-stat">
                <span>Days left</span>
                <strong>{remainingDays}</strong>
              </div>
            </div>
          </div>
        </section>
      </DashboardMotionItem>

      <div className="jf-dashboard-metric-grid grid w-full min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-wrap-primary min-w-0">
          <MetricCard
            title="Month Balance"
            subtitle={currentMonthLabel}
            amount={fmt(netProfit)}
            change={4.35}
            iconName="wallet"
            accentColor="#3b82f6"
            progress={62}
          />
        </DashboardMotionItem>

        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-wrap-success min-w-0">
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

        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-wrap-danger min-w-0">
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

        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-wrap-warning min-w-0">
          <MetricCard
            title="Investments This Month"
            subtitle={currentMonthLabel}
            amount={fmt(monthlyInvestmentsValue)}
            change={7.65}
            iconName="investments"
            accentColor="#f59e0b"
            progress={68}
          />
        </DashboardMotionItem>
      </div>

      <DashboardMotionItem className="jf-dashboard-feature-wrap min-w-0">
        <FinancePulseCard
          income={fmt(todayTotals.income)}
          expenses={fmt(todayTotals.expenses)}
          net={fmt(netToday)}
          netTone={netTodayTone}
          remainingDays={remainingDays}
        />
      </DashboardMotionItem>

      <div className="jf-dashboard-chart-grid grid w-full min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,0.85fr)_minmax(260px,0.85fr)_minmax(420px,1.55fr)]">
        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-tall min-w-0">
          <SpendRecordWidget
            monthlySpend={fmt(expenses)}
            dailySpend={fmt(dailySpend)}
            dailyExpenseTrend={dailyExpenseTrend}
          />
        </DashboardMotionItem>

        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-tall min-w-0">
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
              <div className="dashboard-chart-empty jf-dashboard-empty-state min-h-[156px]">
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

        <DashboardMotionItem className="jf-dashboard-card-wrap jf-dashboard-card-wide min-w-0">
          <IncomeExpenseChart data={chartData} />
        </DashboardMotionItem>
      </div>

      <div className="jf-dashboard-lower-grid grid w-full min-w-0 grid-cols-1 items-stretch gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,0.95fr)_minmax(320px,1.1fr)]">
        <DashboardMotionItem className="jf-dashboard-card-wrap h-full min-w-0">
          <SpendingBreakdown
            data={spendingData}
            total={expenses}
            periodLabel={currentMonthLabel}
          />
        </DashboardMotionItem>

        <DashboardMotionItem className="jf-dashboard-card-wrap h-full min-w-0">
          <GoalsProgress goals={goalRows} maxVisible={4} />
        </DashboardMotionItem>

        <DashboardMotionItem className="jf-dashboard-card-wrap h-full min-w-0">
          <RecentTransactions transactions={recentTransactions} />
        </DashboardMotionItem>
      </div>
    </DashboardMotion>
  );
}
