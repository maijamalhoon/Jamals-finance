import { createClient } from "@/lib/supabase/server";
import StatCard from "@/components/dashboard/StatCard";
import IncomeExpenseChart from "@/components/dashboard/IncomeExpenseChart";
import SpendingBreakdown from "@/components/dashboard/SpendingBreakdown";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import AIInsightPanel from "@/components/dashboard/AIInsightPanel";
import GoalsProgress from "@/components/dashboard/GoalsProgress";
import CurrencyConverter from "@/components/dashboard/CurrencyConverter";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart2,
  PieChart,
} from "lucide-react";

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

  // Daily chart data for this month
  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTxns = txns.filter((t) => t.date === dateStr);
    return {
      date: `${day} ${now.toLocaleDateString("en-US", { month: "short" })}`,
      income: dayTxns
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0),
      expenses: dayTxns
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0),
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

  const stats = [
    {
      title: "Total Balance",
      amount: fmt(totalBalance),
      usd: usd(totalBalance),
      change: 4.35,
      icon: Wallet,
      iconColor: "text-indigo-300",
      iconBg: "bg-indigo-500/15",
    },
    {
      title: "Total Income",
      amount: fmt(income),
      usd: usd(income),
      change: pct(income, lastIncome),
      icon: TrendingUp,
      iconColor: "text-green-300",
      iconBg: "bg-green-500/15",
    },
    {
      title: "Total Expenses",
      amount: fmt(expenses),
      usd: usd(expenses),
      change: pct(expenses, lastExpenses),
      icon: TrendingDown,
      iconColor: "text-red-300",
      iconBg: "bg-red-500/15",
    },
    {
      title: "Net Profit",
      amount: fmt(netProfit),
      usd: usd(netProfit),
      change: pct(netProfit, lastIncome - lastExpenses),
      icon: BarChart2,
      iconColor: "text-cyan-300",
      iconBg: "bg-cyan-500/15",
    },
    {
      title: "Investments Value",
      amount: fmt(investmentsValue),
      usd: usd(investmentsValue),
      change: 7.65,
      icon: PieChart,
      iconColor: "text-amber-300",
      iconBg: "bg-amber-500/15",
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-300/80">
            Finance command center
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal text-white">
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
      {/* Stat Cards — 2 cols mobile, 3 cols tablet, 5 cols desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Charts — stacked mobile, side by side desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <IncomeExpenseChart data={chartData} />
        </div>
        <SpendingBreakdown data={spendingData} total={expenses} />
      </div>

      {/* Bottom — stacked mobile, side by side desktop */}
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
