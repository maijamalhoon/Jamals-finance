"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import ChartFrame from "@/components/ui/chart-frame";
import type { CashFlowPoint, CategoryBreakdownItem } from "@/lib/analytics/calculations";

function ChartCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
      <div className="mb-4 min-w-0">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
          <BarChart3 aria-hidden="true" className="size-3.5" />
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-bold text-text-primary">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-text-secondary">{description}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="finance-panel-soft grid min-h-56 place-items-center px-5 text-center text-sm text-text-secondary">
      {message}
    </div>
  );
}

function CashFlowTable({ data }: { data: CashFlowPoint[] }) {
  const { formatCurrency } = useCurrency();
  return (
    <div className="sr-only">
      <table>
        <caption>Cash-flow chart data</caption>
        <thead>
          <tr><th>Period</th><th>Income</th><th>Expenses</th><th>Cumulative net flow</th></tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={`${point.start}-${point.end}`}>
              <th>{point.label}</th>
              <td>{formatCurrency(point.income)}</td>
              <td>{formatCurrency(point.expenses)}</td>
              <td>{formatCurrency(point.cumulativeNetFlow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CashFlowCharts({ data }: { data: CashFlowPoint[] }) {
  const { formatCurrency } = useCurrency();
  const hasActivity = data.some((point) => point.income !== 0 || point.expenses !== 0);

  if (!hasActivity) {
    return (
      <ChartCard
        eyebrow="Cash flow"
        title="Income and spending"
        description="Chronological activity for the selected date range."
      >
        <EmptyChart message="No income or expense activity was recorded in this range." />
      </ChartCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2">
      <ChartCard
        eyebrow="Cash flow"
        title="Income vs expenses"
        description="Stored income and expense totals in each non-overlapping time bucket."
      >
        <div
          role="img"
          aria-label="Bar chart comparing income and expenses by time bucket"
          className="h-64 min-w-0 overflow-hidden sm:h-72"
        >
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[(minimum: number) => Math.min(minimum, 0), (maximum: number) => Math.max(maximum, 0)]} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickLine={false} axisLine={false} width={54} tickFormatter={(value) => formatCurrency(Number(value), { compact: true })} />
                <Tooltip
                  cursor={{ fill: "var(--hover)" }}
                  contentStyle={{ background: "var(--chart-tooltip)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-primary)" }}
                  formatter={(value, name) => [formatCurrency(Number(value ?? 0)), name === "income" ? "Income" : "Expenses"]}
                />
                <Legend formatter={(value) => value === "income" ? "Income" : "Expenses"} />
                <Bar dataKey="income" fill="var(--success)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="expenses" fill="var(--danger)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
        <CashFlowTable data={data} />
      </ChartCard>

      <ChartCard
        eyebrow="Net position"
        title="Cumulative net cash flow"
        description="Income minus expenses accumulated from the first selected date."
      >
        <div
          role="img"
          aria-label="Step chart of cumulative net cash flow by time bucket"
          className="h-64 min-w-0 overflow-hidden sm:h-72"
        >
          <ChartFrame>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 8, right: 10, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[(minimum: number) => Math.min(minimum, 0), (maximum: number) => Math.max(maximum, 0)]} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickLine={false} axisLine={false} width={54} tickFormatter={(value) => formatCurrency(Number(value), { compact: true })} />
                <ReferenceLine y={0} stroke="var(--text-secondary)" strokeWidth={1.5} />
                <Tooltip
                  contentStyle={{ background: "var(--chart-tooltip)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-primary)" }}
                  formatter={(value) => [formatCurrency(Number(value ?? 0)), "Cumulative net flow"]}
                />
                <Line type="stepAfter" dataKey="cumulativeNetFlow" stroke="var(--chart-series-1)" strokeWidth={3} dot={{ r: 3, fill: "var(--chart-series-1)" }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartFrame>
        </div>
        <CashFlowTable data={data} />
      </ChartCard>
    </div>
  );
}

export function SpendingDistributionChart({ data }: { data: CategoryBreakdownItem[] }) {
  const { formatCurrency } = useCurrency();
  if (data.length === 0) return <EmptyChart message="No expense categories were recorded in this range." />;

  return (
    <div className="grid min-w-0 items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.8fr)]">
      <div
        role="img"
        aria-label="Donut chart of spending distribution by category"
        className="h-60 min-w-0 overflow-hidden sm:h-64"
      >
        <ChartFrame>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="name" innerRadius="52%" outerRadius="78%" paddingAngle={2} isAnimationActive={false}>
                {data.map((item) => <Cell key={item.id} fill={item.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "var(--chart-tooltip)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-primary)" }}
                formatter={(value) => formatCurrency(Number(value ?? 0))}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
      <ul className="min-w-0 space-y-2" aria-label="Spending distribution summary">
        {data.map((item) => (
          <li key={item.id} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-sm">
            <span aria-hidden="true" className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="min-w-0 truncate text-text-secondary">{item.name}</span>
            <span className="text-right font-semibold tabular-nums text-text-primary">
              {formatCurrency(item.amount)} <span className="text-xs font-medium text-text-tertiary">({item.percentage}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
