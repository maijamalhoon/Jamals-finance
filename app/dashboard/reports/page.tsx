import { createClient } from "@/lib/supabase/server";
import MonthlyChart from "@/components/reports/MonthlyChart";
import CategoryBreakdown from "@/components/reports/CategoryBreakdown";
import ExportButton from "@/components/reports/ExportButton";

function getLastSixMonths() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      first: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      last: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${lastDay}`,
    };
  });
}

export default async function ReportsPage() {
  const supabase = await createClient();
  const months = getLastSixMonths();

  // Fetch all transactions in the last 6 months
  const { data: rawTxns } = await supabase
    .from("transactions")
    .select("*, categories(name, color)")
    .gte("date", months[0].first)
    .lte("date", months[5].last);

  const txns = rawTxns ?? [];

  // Build monthly bar chart data
  const chartData = months.map((m) => {
    const inMonth = txns.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === m.year && d.getMonth() === m.month;
    });
    return {
      month: m.label,
      income: inMonth
        .filter((t) => t.type === "income")
        .reduce((s, t) => s + Number(t.amount), 0),
      expenses: inMonth
        .filter((t) => t.type === "expense")
        .reduce((s, t) => s + Number(t.amount), 0),
    };
  });

  // This month's transactions
  const now = new Date();
  const thisMon = txns.filter((t) => {
    const d = new Date(t.date);
    return (
      d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    );
  });

  const income = thisMon
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const expenses = thisMon
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const net = income - expenses;
  const savings = income > 0 ? (net / income) * 100 : 0;

  // Category breakdown for this month
  const catMap: Record<string, { amount: number; color: string }> = {};
  thisMon
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = (t.categories as any)?.name || "Other";
      const color = (t.categories as any)?.color || "#6b7280";
      if (!catMap[name]) catMap[name] = { amount: 0, color };
      catMap[name].amount += Number(t.amount);
    });

  const categoryData = Object.entries(catMap)
    .map(([name, { amount, color }]) => ({
      name,
      amount,
      color,
      pct: expenses > 0 ? (amount / expenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  const summaryCards = [
    { label: "Income", value: fmt(income), color: "text-green-400" },
    { label: "Expenses", value: fmt(expenses), color: "text-red-400" },
    {
      label: "Net Profit",
      value: fmt(net),
      color: net >= 0 ? "text-green-400" : "text-red-400",
    },
    {
      label: "Savings Rate",
      value: `${savings.toFixed(1)}%`,
      color: savings >= 20 ? "text-green-400" : "text-yellow-400",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold">Reports</h2>
          <p className="text-gray-500 text-sm mt-1">
            {now.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <ExportButton />
      </div>

      {/* This Month Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summaryCards.map((s, i) => (
          <div
            key={i}
            className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-4"
          >
            <p className="text-gray-500 text-xs mb-2">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <MonthlyChart data={chartData} />
        <CategoryBreakdown data={categoryData} />
      </div>

      {/* Transaction Counts */}
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
        <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-4">
          This Month — Transaction Summary
        </p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: "Total Transactions", value: thisMon.length },
            {
              label: "Income Entries",
              value: thisMon.filter((t) => t.type === "income").length,
            },
            {
              label: "Expense Entries",
              value: thisMon.filter((t) => t.type === "expense").length,
            },
          ].map((s, i) => (
            <div key={i}>
              <p className="text-white text-2xl font-bold">{s.value}</p>
              <p className="text-gray-500 text-xs mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
