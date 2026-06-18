import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/dashboard/StatCard";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AIInsightPanel from "@/components/dashboard/AIInsightPanel";
import GoalsProgress from "@/components/dashboard/GoalsProgress";
import CurrencyConverter from "@/components/dashboard/CurrencyConverter";
import DashboardSignals from "@/components/dashboard/DashboardSignals";
import TodaysOverview from "@/components/dashboard/TodaysOverview";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  CalendarDays,
  Gauge,
  Landmark,
  Target,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const now = new Date();

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
    supabase.from("investments").select("current_price, quantity"),
    supabase.from("goals").select("*").order("created_at").limit(3),
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
  const todayStr = now.toISOString().split("T")[0];
  const todayTotals = dailyTotals.get(todayStr) ?? { income: 0, expenses: 0 };
  const todayTransactions = txns.filter((t) => t.date === todayStr);
  const activeDayNumbers = Array.from(dailyTotals.keys()).map((date) =>
    Number(date.split("-")[2]),
  );

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
  const usd = (n: number) => `$${(n / 281.2).toFixed(2)} USD`;
  const dayOfMonth = now.getDate();
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const dailySpend = expenses / Math.max(dayOfMonth, 1);
  const monthProgress = (dayOfMonth / daysInMonth) * 100;
  const projectedExpenses = dailySpend * daysInMonth;
  const remainingDays = Math.max(daysInMonth - dayOfMonth, 0);
  const averageIncomePerEntry =
    txns.filter((t) => t.type === "income").length > 0 ?
      income / txns.filter((t) => t.type === "income").length
    : 0;
  const averageExpensePerEntry =
    txns.filter((t) => t.type === "expense").length > 0 ?
      expenses / txns.filter((t) => t.type === "expense").length
    : 0;
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
      usd: usd(totalBalance),
      change: 4.35,
      icon: Wallet,
      iconColor: "text-indigo-300",
      iconBg: "bg-indigo-500/15",
      detail: `${Math.round(liquidityRatio)}% held as liquid balance`,
      progress: liquidityRatio,
      href: "/dashboard/accounts",
    },
    {
      title: "Total Income",
      amount: fmt(income),
      usd: usd(income),
      change: pct(income, lastIncome),
      icon: TrendingUp,
      iconColor: "text-green-300",
      iconBg: "bg-green-500/15",
      detail: `${fmt(averageIncomePerEntry)} average income entry`,
      progress: Math.min(100, Math.max(0, savingsRate)),
      href: "/dashboard/income",
    },
    {
      title: "Total Expenses",
      amount: fmt(expenses),
      usd: usd(expenses),
      change: pct(expenses, lastExpenses),
      icon: TrendingDown,
      iconColor: "text-red-300",
      iconBg: "bg-red-500/15",
      detail: `${fmt(averageExpensePerEntry)} average expense entry`,
      progress: monthProgress,
      href: "/dashboard/expenses",
    },
    {
      title: "Net Profit",
      amount: fmt(netProfit),
      usd: usd(netProfit),
      change: pct(netProfit, lastIncome - lastExpenses),
      icon: BarChart2,
      iconColor: "text-cyan-300",
      iconBg: "bg-cyan-500/15",
      detail:
        netProfit >= 0 ?
          `${Math.round(savingsRate)}% savings efficiency`
        : "Recovery mode: reduce burn rate",
      progress: Math.min(100, Math.max(0, savingsRate)),
      href: "/dashboard/reports",
    },
    {
      title: "Investments Value",
      amount: fmt(investmentsValue),
      usd: usd(investmentsValue),
      change: 7.65,
      icon: PieChart,
      iconColor: "text-amber-300",
      iconBg: "bg-amber-500/15",
      detail: `${Math.round(100 - liquidityRatio)}% of tracked wealth invested`,
      progress: Math.max(0, 100 - liquidityRatio),
      href: "/dashboard/investments",
    },
  ];

  const intelligenceTiles = [
    {
      label: "Month Progress",
      value: `${dayOfMonth}/${daysInMonth} days`,
      detail: `${remainingDays} days left in this cycle`,
      icon: CalendarDays,
      tone: "text-sky-200 bg-sky-300/10",
    },
    {
      label: "Spend Forecast",
      value: fmt(projectedExpenses),
      detail: monthlyBurnStatus,
      icon: Gauge,
      tone: "text-amber-200 bg-amber-300/10",
    },
    {
      label: "Savings Efficiency",
      value: `${Math.round(savingsRate)}%`,
      detail:
        savingsRate >= 25 ? "Strong retention pace"
        : savingsRate >= 0 ? "Healthy, but can improve"
        : "Expense pressure detected",
      icon: Target,
      tone: "text-emerald-200 bg-emerald-300/10",
    },
    {
      label: "Capital Mix",
      value: `${Math.round(liquidityRatio)}% liquid`,
      detail: `${fmt(totalBalance + investmentsValue)} tracked capital`,
      icon: Landmark,
      tone: "text-violet-200 bg-violet-300/10",
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="page-heading">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
            Finance command center
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white sm:text-3xl">
            This month's overview
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Balance, cash flow, spending, and progress in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-green-300" />
          Updated{" "}
          {now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <TodaysOverview
        income={fmt(todayTotals.income)}
        expenses={fmt(todayTotals.expenses)}
        net={fmt(todayTotals.income - todayTotals.expenses)}
        netPositive={todayTotals.income - todayTotals.expenses >= 0}
        transactionCount={todayTransactions.length}
        avgDailySpend={fmt(dailySpend)}
        topCategory={topCategory}
        savingsRate={savingsRate}
        activeDays={activeDayNumbers.length}
        projectedExpenses={fmt(projectedExpenses)}
        remainingDays={remainingDays}
      />

      <DashboardSignals
        savingsRate={savingsRate}
        dailySpend={fmt(dailySpend)}
        dailyExpenseTrend={dailyExpenseTrend}
        activeDayNumbers={activeDayNumbers}
        daysInMonth={daysInMonth}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {intelligenceTiles.map(({ label, value, detail, icon: Icon, tone }) => (
          <div key={label} className="finance-panel-soft widget-link p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-lg font-bold text-white">{value}</p>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-3xl ${tone}`}>
                <Icon size={17} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <IncomeExpenseChart data={chartData} />
        </div>
        <SpendingBreakdown data={spendingData} total={expenses} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <RecentTransactions transactions={txns.slice(0, 5) as any} />
        </div>
        <div className="space-y-4">
          <AIInsightPanel />
          <GoalsProgress goals={(goals ?? []) as any} />
          <CurrencyConverter />
        </div>
      </div>
    </div>
  );
}
