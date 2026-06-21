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
  DashboardMotion,
  DashboardMotionItem,
} from "@/components/dashboard/DashboardMotion";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
  CalendarDays,
  Gauge,
  Landmark,
  HandCoins,
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
    supabase.from("investments").select("current_price, quantity"),
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
      iconColor: "text-blue-600",
      iconBg: "bg-blue-50",
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
      iconColor: "text-emerald-600",
      iconBg: "bg-emerald-50",
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
      iconColor: "text-red-600",
      iconBg: "bg-red-50",
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
      iconColor: "text-sky-600",
      iconBg: "bg-sky-50",
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
      iconColor: "text-amber-600",
      iconBg: "bg-amber-50",
      detail: `${Math.round(100 - liquidityRatio)}% of tracked wealth invested`,
      progress: Math.max(0, 100 - liquidityRatio),
      href: "/dashboard/investments",
    },
    {
      title: "Payables Due",
      amount: fmt(payableRemaining),
      usd: usd(payableRemaining),
      change: 0,
      icon: HandCoins,
      iconColor: "text-orange-600",
      iconBg: "bg-orange-50",
      detail:
        overduePayables > 0 ?
          `${overduePayables} overdue payable${overduePayables === 1 ? "" : "s"}`
        : "No overdue payables",
      progress: payableRemaining > 0 ? 65 : 0,
      href: "/dashboard/payables",
    },
  ];

  const intelligenceTiles = [
    {
      label: "Month Progress",
      value: `${dayOfMonth}/${daysInMonth} days`,
      detail: `${remainingDays} days left in this cycle`,
      icon: CalendarDays,
      tone: "text-sky-600 bg-sky-50",
    },
    {
      label: "Spend Forecast",
      value: fmt(projectedExpenses),
      detail: monthlyBurnStatus,
      icon: Gauge,
      tone: "text-amber-600 bg-amber-50",
    },
    {
      label: "Savings Efficiency",
      value: `${Math.round(savingsRate)}%`,
      detail:
        savingsRate >= 25 ? "Strong retention pace"
        : savingsRate >= 0 ? "Healthy, but can improve"
        : "Expense pressure detected",
      icon: Target,
      tone: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Capital Mix",
      value: `${Math.round(liquidityRatio)}% liquid`,
      detail: `${fmt(totalBalance + investmentsValue)} tracked capital`,
      icon: Landmark,
      tone: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <DashboardMotion className="space-y-5 pb-8">
      <DashboardMotionItem>
      <div className="page-heading min-h-[126px] overflow-hidden">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-500">
            Finance command center
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950 sm:text-3xl">
            This month's overview
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Balance, cash flow, spending, and progress in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Updated{" "}
          {now.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      </div>
      </DashboardMotionItem>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <DashboardMotionItem key={s.title}>
            <StatCard {...s} />
          </DashboardMotionItem>
        ))}
      </div>

      <DashboardMotionItem>
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
      </DashboardMotionItem>

      <DashboardMotionItem>
        <DashboardSignals
          savingsRate={savingsRate}
          dailySpend={fmt(dailySpend)}
          dailyExpenseTrend={dailyExpenseTrend}
          activeDayNumbers={activeDayNumbers}
          daysInMonth={daysInMonth}
        />
      </DashboardMotionItem>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {intelligenceTiles.map(({ label, value, detail, icon: Icon, tone }) => (
          <DashboardMotionItem key={label}>
          <div className="finance-panel-soft widget-link h-full p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-slate-500">
                  {label}
                </p>
                <p className="mt-2 text-lg font-bold text-slate-950">{value}</p>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-3xl ${tone}`}>
                <Icon size={17} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">{detail}</p>
          </div>
          </DashboardMotionItem>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <DashboardMotionItem className="lg:col-span-2">
          <IncomeExpenseChart data={chartData} />
        </DashboardMotionItem>
        <DashboardMotionItem>
          <SpendingBreakdown data={spendingData} total={expenses} />
        </DashboardMotionItem>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <DashboardMotionItem className="lg:col-span-3">
          <RecentTransactions transactions={txns.slice(0, 5) as any} />
        </DashboardMotionItem>
        <DashboardMotionItem className="space-y-4">
          <AIInsightPanel />
          <GoalsProgress goals={(goals ?? []) as any} />
          <CurrencyConverter />
        </DashboardMotionItem>
      </div>
    </DashboardMotion>
  );
}
