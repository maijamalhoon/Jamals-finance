import { createClient } from "@/lib/supabase/server";
import MonthlyChart from "@/components/reports/MonthlyChart";
import CategoryBreakdown from "@/components/reports/CategoryBreakdown";
import ExportButton from "@/components/reports/ExportButton";

interface RelatedCategory {
  name?: string;
  color?: string;
}

interface ReportTransaction {
  amount: number | string;
  date: string;
  type: "income" | "expense" | string;
  categories?: RelatedCategory | null;
}

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

  const { data: rawTxns } = await supabase
    .from("transactions")
    .select("*, categories(name, color)")
    .gte("date", months[0].first)
    .lte("date", months[5].last);

  const txns = (rawTxns ?? []) as ReportTransaction[];

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

  const catMap: Record<string, { amount: number; color: string }> = {};
  thisMon
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const name = t.categories?.name || "Other";
      const color = t.categories?.color || "#6b7280";
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
      color: savings >= 20 ? "text-green-400" : "text-amber-300",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-subtitle">
            {now.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <ExportButton />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summaryCards.map((s) => (
          <div key={s.label} className="summary-card">
            <p className="mb-2 text-xs text-slate-500">{s.label}</p>
            <p className={`break-words text-lg font-bold ${s.color}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MonthlyChart data={chartData} />
        <CategoryBreakdown data={categoryData} />
      </div>

      <div className="finance-panel p-4 sm:p-5">
        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-slate-500">
          This Month - Transaction Summary
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
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
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
