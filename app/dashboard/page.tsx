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
import BottomInsightCard from "@/components/dashboard/BottomInsightCard";
import {
  DashboardMotion,
  DashboardMotionItem,
} from "@/components/dashboard/DashboardMotion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Zap,
  CalendarDays,
  Gauge,
  Landmark,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
  const lastFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const lastLast = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split("T")[0];
  const daysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  const [
    { data: thisTxns },
    { data: lastTxns },
    { data: accounts },
    { data: investments },
    { data: goals },
    { data: liabilities },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("*, categories(name, color), accounts(name)")
      .gte("date", firstDay)
      .lte("date", lastDay)
      .order("date", { ascending: false }),
    supabase
      .from("transactions")
      .select("type, amount")
      .gte("date", lastFirst)
      .lte("date", lastLast),
    supabase.from("accounts").select("balance"),
    supabase
      .from("investments")
      .select("id, name, type, quantity, purchase_price, current_price, purchased_at")
      .order("created_at", { ascending: false }),
    supabase.from("goals").select("*").order("created_at").limit(3),
    supabase.from("liabilities").select("remaining_amount, status, due_date"),
  ]);

  const txns = thisTxns ?? [];

  // Totals
  const income = txns
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = txns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = income - expenses;
  const totalBalance = (accounts ?? []).reduce(
    (s, a) => s + Number(a.balance),
    0,
  );
  const investmentsValue = (investments ?? []).reduce(
    (s, i) => s + Number(i.current_price) * Number(i.quantity),
    0,
  );
  const totalInvested = (investments ?? []).reduce(
    (s, i) => s + Number(i.quantity) * Number(i.purchase_price),
    0,
  );
  const totalPnL = investmentsValue - totalInvested;
  const totalPnLPct = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;
  const payableRemaining = (liabilities ?? []).reduce(
    (s, liability) => s + Number(liability.remaining_amount),
    0,
  );
  const overduePayables = (liabilities ?? []).filter(
    (liability) =>
      Number(liability.remaining_amount) > 0 &&
      liability.due_date &&
      liability.due_date < todayStr,
  ).length;
  void netProfit;
  void payableRemaining;
  void overduePayables;
  const lastIncome = (lastTxns ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const lastExpenses = (lastTxns ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const pct = (cur: number, prev: number) =>
    prev > 0 ? parseFloat((((cur - prev) / prev) * 100).toFixed(2)) : 0;

  const dailyTotals = new Map<string, { income: number; expenses: number }>();
  txns.forEach((t) => {
    const current = dailyTotals.get(t.date) ?? { income: 0, expenses: 0 };
    if (t.type === "income") current.income += Number(t.amount);
    if (t.type === "expense") current.expenses += Number(t.amount);
    dailyTotals.set(t.date, current);
  });
  const todayTotals = dailyTotals.get(todayStr) ?? { income: 0, expenses: 0 };

  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const totals = dailyTotals.get(dateStr);
    return {
      date: `${day} ${now.toLocaleDateString("en-US", { month: "short" })}`,
      income: totals?.income ?? 0,
      expenses: totals?.expenses ?? 0,
    };
  });

  // Spending breakdown by category
  const catMap: Record<string, { amount: number; color: string }> = {};
  txns
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = (t.categories as any)?.name || "Other";
      const color = (t.categories as any)?.color || "#6b7280";
      if (!catMap[name]) catMap[name] = { amount: 0, color };
      catMap[name].amount += Number(t.amount);
    });
  const spendingData = Object.entries(catMap)
    .map(([name, { amount, color }]) => ({
      name,
      value: amount,
      color,
      percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;
  const dayOfMonth = now.getDate();
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const dailySpend = expenses / Math.max(dayOfMonth, 1);
  const projectedExpenses = dailySpend * daysInMonth;
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const liquidityRatio =
    totalBalance + investmentsValue > 0 ?
      (totalBalance / (totalBalance + investmentsValue)) * 100
    : 0;
  const monthlyBurnStatus =
    projectedExpenses > expenses ?
      `${fmt(projectedExpenses)} projected by month end`
    : "Spend pace is stable";
  const dailyExpenseTrend = chartData.map((day) => day.expenses);
  const topCategory =
    spendingData[0] ?
      {
        name: spendingData[0].name,
        amount: fmt(spendingData[0].value),
      }
    : null;

  const stats = [
    {
      title: "Total Balance",
      amount: fmt(totalBalance),
      change: 4.35,
      icon: Wallet,
      accentColor: "#3b82f6",
      progress: 62,
    },
    {
      title: "Monthly Income",
      amount: fmt(income),
      change: pct(income, lastIncome),
      icon: TrendingUp,
      accentColor: "#22c55e",
      progress: 64,
    },
    {
      title: "Total Expenses",
      amount: fmt(expenses),
      change: pct(expenses, lastExpenses),
      icon: TrendingDown,
      accentColor: "#ef4444",
      progress: 38,
    },
    {
      title: "Investments",
      amount: fmt(investmentsValue),
      change: 7.65,
      icon: Zap,
      accentColor: "#f59e0b",
      progress: 68,
    },
  ];

  const intelligenceTiles = [
    {
      label: "Month Progress",
      value: `${dayOfMonth}/${daysInMonth} days`,
      detail: `${remainingDays} days left in this cycle`,
      icon: CalendarDays,
    },
    {
      label: "Spend Forecast",
      value: fmt(projectedExpenses),
      detail: monthlyBurnStatus,
      icon: Gauge,
    },
    {
      label: "Savings Efficiency",
      value: `${Math.round(savingsRate)}%`,
      detail:
        savingsRate >= 25 ? "Strong retention pace"
        : savingsRate >= 0 ? "Healthy, but can improve"
        : "Expense pressure detected",
      icon: Target,
    },
    {
      label: "Capital Mix",
      value: `${Math.round(liquidityRatio)}% liquid`,
      detail: `${fmt(totalBalance + investmentsValue)} tracked capital`,
      icon: Landmark,
    },
  ];

  return (
    <DashboardMotion className="space-y-6 pb-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <DashboardMotionItem key={s.title}>
            <MetricCard {...s} />
          </DashboardMotionItem>
        ))}
      </div>

      <DashboardMotionItem>
        <FinancePulseCard
          income={fmt(todayTotals.income)}
          expenses={fmt(todayTotals.expenses)}
          net={fmt(todayTotals.income - todayTotals.expenses)}
          netPositive={todayTotals.income - todayTotals.expenses >= 0}
          topCategory={topCategory}
          savingsRate={savingsRate}
          remainingDays={remainingDays}
        />
      </DashboardMotionItem>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] xl:items-stretch">
        <DashboardMotionItem className="[&>section]:h-full">
          <SpendRecordWidget
            dailySpend={fmt(dailySpend)}
            dailyExpenseTrend={dailyExpenseTrend}
          />
        </DashboardMotionItem>
        <DashboardMotionItem className="[&>div]:h-full">
          {(investments ?? []).length > 0 ? (
            <InvestmentOverviewWidget
              investments={(investments ?? []) as any}
              totalPnLPct={totalPnLPct}
            />
          ) : (
            <ChartCard
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
          )}
        </DashboardMotionItem>
        <DashboardMotionItem className="[&>section]:h-full">
          <IncomeExpenseChart data={chartData} />
        </DashboardMotionItem>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        <DashboardMotionItem className="[&>div]:h-full">
          <SpendingBreakdown data={spendingData} total={expenses} />
        </DashboardMotionItem>
        <DashboardMotionItem className="[&>div]:h-full">
          <GoalsProgress goals={(goals ?? []) as any} />
        </DashboardMotionItem>
        <DashboardMotionItem className="[&>div]:h-full">
          <RecentTransactions transactions={txns.slice(0, 5) as any} />
        </DashboardMotionItem>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {intelligenceTiles.map((tile) => (
          <DashboardMotionItem key={tile.label}>
            <BottomInsightCard {...tile} />
          </DashboardMotionItem>
        ))}
      </div>
    </DashboardMotion>
  );
}
