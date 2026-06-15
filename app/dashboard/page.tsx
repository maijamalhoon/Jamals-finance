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

function pct(current: number, previous: number) {
  if (previous === 0) return 0;
  return parseFloat((((current - previous) / previous) * 100).toFixed(2));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();

  // This month range
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Last month range (for % change)
  const lastFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toISOString()
    .split("T")[0];
  const lastLast = new Date(now.getFullYear(), now.getMonth(), 0)
    .toISOString()
    .split("T")[0];

  // Fetch everything in parallel
  const [
    { data: thisMonthTxns },
    { data: lastMonthTxns },
    { data: accounts },
    { data: investments },
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
  ]);

  // This month totals
  const income =
    thisMonthTxns
      ?.filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const expenses =
    thisMonthTxns
      ?.filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const netProfit = income - expenses;

  // Last month totals (for % change)
  const lastIncome =
    lastMonthTxns
      ?.filter((t) => t.type === "income")
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const lastExpenses =
    lastMonthTxns
      ?.filter((t) => t.type === "expense")
      .reduce((s, t) => s + Number(t.amount), 0) ?? 0;
  const lastNet = lastIncome - lastExpenses;

  // Total balance across all accounts
  const totalBalance =
    accounts?.reduce((s, a) => s + Number(a.balance), 0) ?? 0;

  // Total investment portfolio value
  const investmentsValue =
    investments?.reduce(
      (s, i) => s + Number(i.current_price) * Number(i.quantity),
      0,
    ) ?? 0;

  // Recent 5 transactions for the table
  const recentTxns = (thisMonthTxns ?? []).slice(0, 5);

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

  const stats = [
    {
      title: "Total Balance",
      amount: fmt(totalBalance),
      usd: `$${(totalBalance / 281.2).toFixed(2)} USD`,
      change: 4.35,
      icon: Wallet,
      iconColor: "text-indigo-400",
      iconBg: "bg-indigo-500/15",
    },
    {
      title: "Total Income",
      amount: fmt(income),
      usd: `$${(income / 281.2).toFixed(2)} USD`,
      change: pct(income, lastIncome),
      icon: TrendingUp,
      iconColor: "text-green-400",
      iconBg: "bg-green-500/15",
    },
    {
      title: "Total Expenses",
      amount: fmt(expenses),
      usd: `$${(expenses / 281.2).toFixed(2)} USD`,
      change: pct(expenses, lastExpenses),
      icon: TrendingDown,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/15",
    },
    {
      title: "Net Profit",
      amount: fmt(netProfit),
      usd: `$${(netProfit / 281.2).toFixed(2)} USD`,
      change: pct(netProfit, lastNet),
      icon: BarChart2,
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/15",
    },
    {
      title: "Investments Value",
      amount: fmt(investmentsValue),
      usd: `$${(investmentsValue / 281.2).toFixed(2)} USD`,
      change: 7.65,
      icon: PieChart,
      iconColor: "text-purple-400",
      iconBg: "bg-purple-500/15",
    },
  ];

  return (
    <div className="space-y-5 pb-4">
      {/* Row 1 — Stat Cards */}
      <div className="grid grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Row 2 — Charts */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <IncomeExpenseChart />
        </div>
        <SpendingBreakdown />
      </div>

      {/* Row 3 — Transactions + Right Panel */}
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-3">
          <RecentTransactions transactions={recentTxns as any} />
        </div>
        <div className="space-y-4">
          <AIInsightPanel />
          <GoalsProgress />
          <CurrencyConverter />
        </div>
      </div>
    </div>
  );
}
