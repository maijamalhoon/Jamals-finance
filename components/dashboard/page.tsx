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

const stats = [
  {
    title: "Total Balance",
    amount: "PKR 1,246,540",
    usd: "$4,438.50 USD",
    change: 4.35,
    icon: Wallet,
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/15",
  },
  {
    title: "Total Income",
    amount: "PKR 285,430",
    usd: "$1,017.94 USD",
    change: 12.45,
    icon: TrendingUp,
    iconColor: "text-green-400",
    iconBg: "bg-green-500/15",
  },
  {
    title: "Total Expenses",
    amount: "PKR 152,640",
    usd: "$544.34 USD",
    change: -2.35,
    icon: TrendingDown,
    iconColor: "text-red-400",
    iconBg: "bg-red-500/15",
  },
  {
    title: "Net Profit",
    amount: "PKR 132,790",
    usd: "$473.60 USD",
    change: 18.45,
    icon: BarChart2,
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/15",
  },
  {
    title: "Investments Value",
    amount: "PKR 808,250",
    usd: "$2,879.16 USD",
    change: 7.65,
    icon: PieChart,
    iconColor: "text-purple-400",
    iconBg: "bg-purple-500/15",
  },
];

export default function DashboardPage() {
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
          <RecentTransactions />
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
