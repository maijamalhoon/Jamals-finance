import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  Boxes,
  BarChart3,
  CircleDollarSign,
  Clock3,
  Landmark,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "@/components/icons/jalvoro/compat";

type NumberValue = number | string;

type AccountLine = {
  account_id: string;
  code: string;
  name: string;
  section?: string;
  account_subtype?: string | null;
  system_key?: string | null;
  amount: NumberValue;
};

type CashTransaction = {
  journal_entry_id: string;
  journal_number: NumberValue | null;
  entry_date: string;
  source_type: string;
  reference: string | null;
  description: string;
  category: "operating" | "investing" | "financing";
  amount: NumberValue;
};

type AgingItem = {
  invoice_id?: string;
  invoice_code?: string;
  bill_id?: string;
  bill_code?: string;
  supplier_document_number?: string | null;
  invoice_date?: string;
  bill_date?: string;
  due_date: string;
  customer_name?: string;
  supplier_name?: string;
  currency: string;
  total_base: NumberValue;
  paid_base: NumberValue;
  returned_base: NumberValue;
  outstanding_base: NumberValue;
  days_overdue: NumberValue;
  bucket: string;
};

type StockPosition = {
  product_id: string;
  sku: string;
  product_name: string;
  unit_of_measure: string;
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  quantity: NumberValue;
  average_cost: NumberValue;
  inventory_value: NumberValue;
};

type SalesReturn = {
  return_id: string;
  return_code: string;
  return_date: string;
  invoice_code: string;
  customer_name: string;
  total_base: NumberValue;
  ar_credit_base: NumberValue;
  customer_credit_base: NumberValue;
  quantity: NumberValue;
  restocked_quantity: NumberValue;
  cogs_reversed: NumberValue;
};

type PurchaseReturn = {
  return_id: string;
  return_code: string;
  return_date: string;
  bill_code: string;
  supplier_name: string;
  total_base: NumberValue;
  ap_debit_base: NumberValue;
  supplier_receivable_base: NumberValue;
  quantity: NumberValue;
  inventory_value: NumberValue;
  variance: NumberValue;
};

export type BusinessReportSnapshot = {
  base_currency: string;
  start_date: string;
  end_date: string;
  as_of_date: string;
  profit_and_loss: {
    lines: AccountLine[];
    revenue: NumberValue;
    cost_of_sales: NumberValue;
    gross_profit: NumberValue;
    operating_expenses: NumberValue;
    operating_profit: NumberValue;
    other_income: NumberValue;
    other_expenses: NumberValue;
    net_profit: NumberValue;
  };
  balance_sheet: {
    assets: AccountLine[];
    liabilities: AccountLine[];
    equity: AccountLine[];
    current_earnings: NumberValue;
    total_assets: NumberValue;
    total_liabilities: NumberValue;
    posted_equity: NumberValue;
    total_equity: NumberValue;
    total_liabilities_and_equity: NumberValue;
    difference: NumberValue;
    is_balanced: boolean;
  };
  cash_flow: {
    transactions: CashTransaction[];
    opening_cash: NumberValue;
    operating_net: NumberValue;
    investing_net: NumberValue;
    financing_net: NumberValue;
    total_inflows: NumberValue;
    total_outflows: NumberValue;
    net_change: NumberValue;
    closing_cash: NumberValue;
    reconciles: boolean;
  };
  ar_aging: AgingReport;
  ap_aging: AgingReport;
  stock_valuation: {
    positions: StockPosition[];
    total_quantity: NumberValue;
    total_value: NumberValue;
  };
  returns_credits: {
    sales_returns: SalesReturn[];
    purchase_returns: PurchaseReturn[];
    sales_return_total: NumberValue;
    customer_credits: NumberValue;
    ar_credits: NumberValue;
    cogs_reversed: NumberValue;
    purchase_return_total: NumberValue;
    supplier_refund_receivable: NumberValue;
    ap_reductions: NumberValue;
    purchase_variance: NumberValue;
  };
};

type AgingReport = {
  items: AgingItem[];
  total: NumberValue;
  current: NumberValue;
  "1_30": NumberValue;
  "31_60": NumberValue;
  "61_90": NumberValue;
  "90_plus": NumberValue;
};

type ReportView =
  | "overview"
  | "profit-loss"
  | "balance-sheet"
  | "cash-flow"
  | "receivables"
  | "payables"
  | "stock"
  | "returns";

type Props = {
  businessSlug: string;
  businessName: string;
  snapshot: BusinessReportSnapshot;
  activeView: ReportView;
};

const REPORTS: Array<{ key: ReportView; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "profit-loss", label: "Profit & Loss" },
  { key: "balance-sheet", label: "Balance Sheet" },
  { key: "cash-flow", label: "Cash Flow" },
  { key: "receivables", label: "AR Aging" },
  { key: "payables", label: "AP Aging" },
  { key: "stock", label: "Stock Valuation" },
  { key: "returns", label: "Returns & Credits" },
];

function numeric(value: NumberValue | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function money(value: NumberValue, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(numeric(value));
}

function quantity(value: NumberValue) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 6 }).format(numeric(value));
}

function date(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function label(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildHref(slug: string, snapshot: BusinessReportSnapshot, view: ReportView) {
  const params = new URLSearchParams({
    start: snapshot.start_date,
    end: snapshot.end_date,
    asOf: snapshot.as_of_date,
    view,
  });
  return `/business/${slug}/reports?${params.toString()}`;
}

function SummaryCard({
  labelText,
  value,
  note,
  icon: Icon,
  tone = "primary",
}: {
  labelText: string;
  value: string;
  note?: string;
  icon: typeof CircleDollarSign;
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  }[tone];
  return (
    <article className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]">
      <span className={`inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] ${toneClass}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-4 text-xs font-bold text-text-secondary">{labelText}</p>
      <strong className="mt-1 block truncate text-lg font-black tabular-nums text-text-primary">{value}</strong>
      {note ? <span className="mt-1 block text-xs text-text-secondary">{note}</span> : null}
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[var(--radius-button)] bg-surface-secondary px-5 py-8 text-center text-sm text-text-secondary">
      {text}
    </div>
  );
}

function AccountRows({ lines, currency }: { lines: AccountLine[]; currency: string }) {
  if (lines.length === 0) return <EmptyState text="No posted account activity for this report." />;
  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div key={line.account_id} className="flex items-center justify-between gap-4 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3">
          <div className="min-w-0">
            <strong className="block truncate text-sm text-text-primary">{line.name}</strong>
            <span className="text-xs text-text-secondary">{line.code}</span>
          </div>
          <strong className="shrink-0 text-sm tabular-nums text-text-primary">{money(line.amount, currency)}</strong>
        </div>
      ))}
    </div>
  );
}

function ProfitLoss({ snapshot }: { snapshot: BusinessReportSnapshot }) {
  const report = snapshot.profit_and_loss;
  const sections = [
    ["Revenue", "revenue"],
    ["Cost of sales", "cost_of_sales"],
    ["Operating expenses", "operating_expense"],
    ["Other income", "other_income"],
    ["Other expenses", "other_expense"],
  ] as const;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard labelText="Revenue" value={money(report.revenue, snapshot.base_currency)} icon={TrendingUp} tone="success" />
        <SummaryCard labelText="Gross profit" value={money(report.gross_profit, snapshot.base_currency)} icon={BarChart3} />
        <SummaryCard labelText="Operating profit" value={money(report.operating_profit, snapshot.base_currency)} icon={BadgeDollarSign} />
        <SummaryCard
          labelText="Net profit"
          value={money(report.net_profit, snapshot.base_currency)}
          icon={numeric(report.net_profit) >= 0 ? ArrowUpRight : ArrowDownRight}
          tone={numeric(report.net_profit) >= 0 ? "success" : "danger"}
        />
      </div>
      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
        <h2 className="font-black text-text-primary">Statement detail</h2>
        <p className="mt-1 text-sm text-text-secondary">Posted ledger activity from {date(snapshot.start_date)} to {date(snapshot.end_date)}.</p>
        <div className="mt-5 space-y-6">
          {sections.map(([title, section]) => {
            const lines = report.lines.filter((line) => line.section === section);
            if (lines.length === 0) return null;
            return (
              <div key={section}>
                <h3 className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-primary">{title}</h3>
                <AccountRows lines={lines} currency={snapshot.base_currency} />
              </div>
            );
          })}
          {report.lines.length === 0 ? <EmptyState text="No posted revenue or expense activity in this period." /> : null}
        </div>
        <div className="mt-6 space-y-2 rounded-[var(--radius-button)] bg-primary-soft px-4 py-4 text-sm text-primary">
          <div className="flex justify-between gap-4"><span>Gross profit</span><strong>{money(report.gross_profit, snapshot.base_currency)}</strong></div>
          <div className="flex justify-between gap-4"><span>Operating profit</span><strong>{money(report.operating_profit, snapshot.base_currency)}</strong></div>
          <div className="flex justify-between gap-4 border-t border-primary/15 pt-3 text-base"><span className="font-black">Net profit</span><strong>{money(report.net_profit, snapshot.base_currency)}</strong></div>
        </div>
      </section>
    </div>
  );
}

function BalanceSheet({ snapshot }: { snapshot: BusinessReportSnapshot }) {
  const report = snapshot.balance_sheet;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard labelText="Total assets" value={money(report.total_assets, snapshot.base_currency)} icon={Landmark} />
        <SummaryCard labelText="Total liabilities" value={money(report.total_liabilities, snapshot.base_currency)} icon={WalletCards} tone="warning" />
        <SummaryCard labelText="Total equity" value={money(report.total_equity, snapshot.base_currency)} icon={Scale} tone="success" />
        <SummaryCard
          labelText="Accounting difference"
          value={money(report.difference, snapshot.base_currency)}
          note={report.is_balanced ? "Statement balances" : "Review ledger integrity"}
          icon={Scale}
          tone={report.is_balanced ? "success" : "danger"}
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-5">
          <h2 className="font-black text-text-primary">Assets</h2>
          <div className="mt-4"><AccountRows lines={report.assets} currency={snapshot.base_currency} /></div>
          <div className="mt-4 flex justify-between rounded-[var(--radius-button)] bg-primary-soft px-4 py-3 text-sm font-black text-primary"><span>Total assets</span><span>{money(report.total_assets, snapshot.base_currency)}</span></div>
        </section>
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-5">
          <h2 className="font-black text-text-primary">Liabilities</h2>
          <div className="mt-4"><AccountRows lines={report.liabilities} currency={snapshot.base_currency} /></div>
          <div className="mt-4 flex justify-between rounded-[var(--radius-button)] bg-warning-soft px-4 py-3 text-sm font-black text-warning"><span>Total liabilities</span><span>{money(report.total_liabilities, snapshot.base_currency)}</span></div>
        </section>
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-5">
          <h2 className="font-black text-text-primary">Equity</h2>
          <div className="mt-4"><AccountRows lines={report.equity} currency={snapshot.base_currency} /></div>
          <div className="mt-3 flex justify-between rounded-[var(--radius-button)] bg-surface-secondary px-4 py-3 text-sm"><span className="text-text-secondary">Current earnings</span><strong>{money(report.current_earnings, snapshot.base_currency)}</strong></div>
          <div className="mt-3 flex justify-between rounded-[var(--radius-button)] bg-success-soft px-4 py-3 text-sm font-black text-success"><span>Total equity</span><span>{money(report.total_equity, snapshot.base_currency)}</span></div>
        </section>
      </div>
    </div>
  );
}

function CashFlow({ snapshot }: { snapshot: BusinessReportSnapshot }) {
  const report = snapshot.cash_flow;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard labelText="Opening cash" value={money(report.opening_cash, snapshot.base_currency)} icon={Banknote} />
        <SummaryCard labelText="Cash inflows" value={money(report.total_inflows, snapshot.base_currency)} icon={ArrowDownRight} tone="success" />
        <SummaryCard labelText="Cash outflows" value={money(report.total_outflows, snapshot.base_currency)} icon={ArrowUpRight} tone="warning" />
        <SummaryCard labelText="Closing cash" value={money(report.closing_cash, snapshot.base_currency)} note={report.reconciles ? "Opening + movement reconciles" : "Cash reconciliation mismatch"} icon={CircleDollarSign} tone={report.reconciles ? "success" : "danger"} />
      </div>
      <section className="grid gap-3 sm:grid-cols-3">
        {([["Operating", report.operating_net], ["Investing", report.investing_net], ["Financing", report.financing_net]] as const).map(([name, amount]) => (
          <article key={name} className="rounded-[var(--radius-card)] bg-surface px-5 py-4 shadow-[var(--shadow-sm)]">
            <span className="text-xs font-bold text-text-secondary">{name} cash flow</span>
            <strong className={`mt-1 block text-lg tabular-nums ${numeric(amount) >= 0 ? "text-success" : "text-warning"}`}>{money(amount, snapshot.base_currency)}</strong>
          </article>
        ))}
      </section>
      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
        <h2 className="font-black text-text-primary">Cash movements</h2>
        <p className="mt-1 text-sm text-text-secondary">Direct cash classification from posted cash and bank journal lines.</p>
        {report.transactions.length === 0 ? <div className="mt-5"><EmptyState text="No cash or bank movement in this period." /></div> : (
          <div className="mt-5 space-y-3">
            {report.transactions.map((item) => (
              <article key={item.journal_entry_id} className="flex flex-col gap-3 rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-text-primary">{item.description}</strong>
                  <span className="mt-1 block text-xs text-text-secondary">{date(item.entry_date)} · {label(item.category)} · {item.reference ?? label(item.source_type)}</span>
                </div>
                <strong className={`shrink-0 tabular-nums ${numeric(item.amount) >= 0 ? "text-success" : "text-warning"}`}>{money(item.amount, snapshot.base_currency)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const AGING_BUCKETS = [
  ["current", "Current"],
  ["1_30", "1–30 days"],
  ["31_60", "31–60 days"],
  ["61_90", "61–90 days"],
  ["90_plus", "90+ days"],
] as const;

function Aging({ snapshot, report, kind }: { snapshot: BusinessReportSnapshot; report: AgingReport; kind: "receivable" | "payable" }) {
  const total = Math.max(numeric(report.total), 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {AGING_BUCKETS.map(([key, title], index) => (
          <SummaryCard
            key={key}
            labelText={title}
            value={money(report[key], snapshot.base_currency)}
            icon={index === 0 ? Clock3 : index < 3 ? ReceiptText : TrendingDown}
            tone={index === 0 ? "primary" : index < 3 ? "warning" : "danger"}
          />
        ))}
      </div>
      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-black text-text-primary">{kind === "receivable" ? "Customer receivables" : "Supplier payables"}</h2>
            <p className="mt-1 text-sm text-text-secondary">Historical balance reconstructed from document, payment, and return dates as of {date(snapshot.as_of_date)}.</p>
          </div>
          <strong className="text-lg tabular-nums text-primary">{money(report.total, snapshot.base_currency)}</strong>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {AGING_BUCKETS.map(([key, title]) => {
            const amount = numeric(report[key]);
            const percent = total > 0 ? Math.min(100, (amount / total) * 100) : 0;
            return (
              <div key={key} className="rounded-[var(--radius-button)] bg-surface-secondary px-3 py-3">
                <div className="flex justify-between gap-2 text-xs"><span className="text-text-secondary">{title}</span><strong>{Math.round(percent)}%</strong></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} /></div>
              </div>
            );
          })}
        </div>
        {report.items.length === 0 ? <div className="mt-5"><EmptyState text={`No open ${kind === "receivable" ? "customer balance" : "supplier balance"} as of this date.`} /></div> : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-text-secondary"><tr><th className="pb-3 pr-4">Document</th><th className="pb-3 pr-4">Party</th><th className="pb-3 pr-4">Due</th><th className="pb-3 pr-4">Age</th><th className="pb-3 pr-4 text-right">Paid</th><th className="pb-3 pr-4 text-right">Returned</th><th className="pb-3 text-right">Outstanding</th></tr></thead>
              <tbody>
                {report.items.map((item) => (
                  <tr key={item.invoice_id ?? item.bill_id} className="border-t border-border/60">
                    <td className="py-4 pr-4 font-black text-text-primary">{item.invoice_code ?? item.bill_code}</td>
                    <td className="py-4 pr-4 text-text-secondary">{item.customer_name ?? item.supplier_name}</td>
                    <td className="py-4 pr-4 text-text-secondary">{date(item.due_date)}</td>
                    <td className="py-4 pr-4 text-text-secondary">{numeric(item.days_overdue) > 0 ? `${quantity(item.days_overdue)} days` : "Current"}</td>
                    <td className="py-4 pr-4 text-right tabular-nums text-text-secondary">{money(item.paid_base, snapshot.base_currency)}</td>
                    <td className="py-4 pr-4 text-right tabular-nums text-text-secondary">{money(item.returned_base, snapshot.base_currency)}</td>
                    <td className="py-4 text-right font-black tabular-nums text-text-primary">{money(item.outstanding_base, snapshot.base_currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StockValuation({ snapshot }: { snapshot: BusinessReportSnapshot }) {
  const report = snapshot.stock_valuation;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard labelText="Inventory value" value={money(report.total_value, snapshot.base_currency)} icon={Boxes} />
        <SummaryCard labelText="Units on hand" value={quantity(report.total_quantity)} icon={PackageCheck} tone="success" />
        <SummaryCard labelText="Warehouse positions" value={String(report.positions.length)} icon={Landmark} />
      </div>
      <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-6">
        <h2 className="font-black text-text-primary">Valuation by warehouse</h2>
        <p className="mt-1 text-sm text-text-secondary">Reconstructed from immutable stock movements through {date(snapshot.as_of_date)}.</p>
        {report.positions.length === 0 ? <div className="mt-5"><EmptyState text="No stock position exists as of this date." /></div> : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.08em] text-text-secondary"><tr><th className="pb-3 pr-4">Product</th><th className="pb-3 pr-4">Warehouse</th><th className="pb-3 pr-4 text-right">Quantity</th><th className="pb-3 pr-4 text-right">Average cost</th><th className="pb-3 text-right">Value</th></tr></thead>
              <tbody>
                {report.positions.map((item) => (
                  <tr key={`${item.product_id}-${item.warehouse_id}`} className="border-t border-border/60">
                    <td className="py-4 pr-4"><strong className="block text-text-primary">{item.product_name}</strong><span className="text-xs text-text-secondary">{item.sku} · {item.unit_of_measure}</span></td>
                    <td className="py-4 pr-4 text-text-secondary">{item.warehouse_name}</td>
                    <td className="py-4 pr-4 text-right font-black tabular-nums text-text-primary">{quantity(item.quantity)}</td>
                    <td className="py-4 pr-4 text-right tabular-nums text-text-secondary">{money(item.average_cost, snapshot.base_currency)}</td>
                    <td className="py-4 text-right font-black tabular-nums text-text-primary">{money(item.inventory_value, snapshot.base_currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ReturnsCredits({ snapshot }: { snapshot: BusinessReportSnapshot }) {
  const report = snapshot.returns_credits;
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard labelText="Sales returns" value={money(report.sales_return_total, snapshot.base_currency)} icon={RotateCcw} tone="warning" />
        <SummaryCard labelText="Customer credits" value={money(report.customer_credits, snapshot.base_currency)} icon={WalletCards} />
        <SummaryCard labelText="Purchase returns" value={money(report.purchase_return_total, snapshot.base_currency)} icon={RotateCcw} tone="warning" />
        <SummaryCard labelText="Supplier refund receivable" value={money(report.supplier_refund_receivable, snapshot.base_currency)} icon={CircleDollarSign} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-5">
          <h2 className="font-black text-text-primary">Sales credit notes</h2>
          <p className="mt-1 text-sm text-text-secondary">Customer credits, AR reductions, restock, and COGS reversals.</p>
          {report.sales_returns.length === 0 ? <div className="mt-5"><EmptyState text="No posted sales return in this period." /></div> : (
            <div className="mt-5 space-y-3">{report.sales_returns.map((item) => (
              <article key={item.return_id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                <div className="flex items-start justify-between gap-3"><div><strong className="text-text-primary">{item.return_code}</strong><span className="mt-1 block text-xs text-text-secondary">{item.customer_name} · {item.invoice_code} · {date(item.return_date)}</span></div><strong className="tabular-nums text-warning">{money(item.total_base, snapshot.base_currency)}</strong></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary"><span>AR reduction {money(item.ar_credit_base, snapshot.base_currency)}</span><span>Customer credit {money(item.customer_credit_base, snapshot.base_currency)}</span><span>Returned {quantity(item.quantity)}</span><span>Restocked {quantity(item.restocked_quantity)}</span></div>
              </article>
            ))}</div>
          )}
        </section>
        <section className="rounded-[var(--radius-card)] bg-surface px-4 py-5 shadow-[var(--shadow-sm)] sm:px-5">
          <h2 className="font-black text-text-primary">Purchase debit notes</h2>
          <p className="mt-1 text-sm text-text-secondary">AP reductions, supplier receivables, stock value, and valuation variance.</p>
          {report.purchase_returns.length === 0 ? <div className="mt-5"><EmptyState text="No posted purchase return in this period." /></div> : (
            <div className="mt-5 space-y-3">{report.purchase_returns.map((item) => (
              <article key={item.return_id} className="rounded-[var(--radius-button)] bg-surface-secondary px-4 py-4">
                <div className="flex items-start justify-between gap-3"><div><strong className="text-text-primary">{item.return_code}</strong><span className="mt-1 block text-xs text-text-secondary">{item.supplier_name} · {item.bill_code} · {date(item.return_date)}</span></div><strong className="tabular-nums text-warning">{money(item.total_base, snapshot.base_currency)}</strong></div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary"><span>AP reduction {money(item.ap_debit_base, snapshot.base_currency)}</span><span>Refund receivable {money(item.supplier_receivable_base, snapshot.base_currency)}</span><span>Returned {quantity(item.quantity)}</span><span>Variance {money(item.variance, snapshot.base_currency)}</span></div>
              </article>
            ))}</div>
          )}
        </section>
      </div>
    </div>
  );
}

function Overview({ businessSlug, snapshot }: { businessSlug: string; snapshot: BusinessReportSnapshot }) {
  const cards = [
    { key: "profit-loss" as const, label: "Net profit", value: money(snapshot.profit_and_loss.net_profit, snapshot.base_currency), icon: BarChart3, tone: numeric(snapshot.profit_and_loss.net_profit) >= 0 ? "success" as const : "danger" as const },
    { key: "balance-sheet" as const, label: "Total assets", value: money(snapshot.balance_sheet.total_assets, snapshot.base_currency), icon: Landmark, tone: "primary" as const },
    { key: "receivables" as const, label: "Accounts receivable", value: money(snapshot.ar_aging.total, snapshot.base_currency), icon: ReceiptText, tone: "warning" as const },
    { key: "stock" as const, label: "Inventory value", value: money(snapshot.stock_valuation.total_value, snapshot.base_currency), icon: Boxes, tone: "primary" as const },
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <SummaryCard key={card.key} labelText={card.label} value={card.value} icon={card.icon} tone={card.tone} />)}
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {REPORTS.filter((item) => item.key !== "overview").map((item) => (
          <Link key={item.key} href={buildHref(businessSlug, snapshot, item.key)} className="finance-focus group rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]">
            <div className="flex items-center justify-between"><span className="inline-flex size-10 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary"><BarChart3 className="size-5" aria-hidden="true" /></span><ArrowUpRight className="size-4 text-primary transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" /></div>
            <h2 className="mt-4 font-black text-text-primary">{item.label}</h2>
            <p className="mt-1 text-sm leading-6 text-text-secondary">Open the verified {item.label.toLowerCase()} report for the selected period.</p>
          </Link>
        ))}
      </section>
      <section className={`rounded-[var(--radius-card)] px-5 py-5 ${snapshot.balance_sheet.is_balanced && snapshot.cash_flow.reconciles ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-black">Report integrity checks</h2><p className="mt-1 text-sm opacity-80">Balance Sheet difference {money(snapshot.balance_sheet.difference, snapshot.base_currency)} · Cash opening plus movement {snapshot.cash_flow.reconciles ? "reconciles" : "does not reconcile"} to closing cash.</p></div></div>
      </section>
    </div>
  );
}

export default function BusinessReportsWorkspace({ businessSlug, businessName, snapshot, activeView }: Props) {
  return (
    <>
      <nav className="mt-6 overflow-x-auto pb-1" aria-label={`${businessName} reports`}>
        <div className="flex min-w-max gap-2">
          {REPORTS.map((report) => (
            <Link
              key={report.key}
              href={buildHref(businessSlug, snapshot, report.key)}
              className={`finance-focus inline-flex min-h-10 items-center rounded-full px-4 text-sm font-black transition-colors ${activeView === report.key ? "bg-primary text-primary-foreground" : "bg-surface text-text-secondary hover:bg-primary-soft hover:text-primary"}`}
            >
              {report.label}
            </Link>
          ))}
        </div>
      </nav>
      <div className="mt-6">
        {activeView === "overview" ? <Overview businessSlug={businessSlug} snapshot={snapshot} /> : null}
        {activeView === "profit-loss" ? <ProfitLoss snapshot={snapshot} /> : null}
        {activeView === "balance-sheet" ? <BalanceSheet snapshot={snapshot} /> : null}
        {activeView === "cash-flow" ? <CashFlow snapshot={snapshot} /> : null}
        {activeView === "receivables" ? <Aging snapshot={snapshot} report={snapshot.ar_aging} kind="receivable" /> : null}
        {activeView === "payables" ? <Aging snapshot={snapshot} report={snapshot.ap_aging} kind="payable" /> : null}
        {activeView === "stock" ? <StockValuation snapshot={snapshot} /> : null}
        {activeView === "returns" ? <ReturnsCredits snapshot={snapshot} /> : null}
      </div>
    </>
  );
}
