import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddPayableButton from "@/components/payables/AddPayableButton";
import PayableCard, { Payable } from "@/components/payables/PayableCard";
import Money from "@/components/currency/Money";
import EmptyState from "@/components/ui/empty-state";
import { getPayableStatus } from "@/lib/finance-options";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  HandCoins,
  Search,
  WalletCards,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Partial", value: "partial" },
  { label: "Overdue", value: "overdue" },
  { label: "Completed", value: "completed" },
];

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status = "all", search = "" } = await searchParams;
  const supabase = await createClient();
  const searchTerm = search.trim().toLowerCase();

  const [{ data: rawPayables }, { data: accounts }] = await Promise.all([
    supabase
      .from("liabilities")
      .select(
        "*, liability_payments(*, accounts(name, type))",
      )
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name, type")
      .eq("status", "active")
      .order("name"),
  ]);

  const allPayables = ((rawPayables ?? []) as Payable[]).map((payable) => ({
    ...payable,
    liability_payments: [...(payable.liability_payments ?? [])].sort((a, b) =>
      b.paid_at.localeCompare(a.paid_at),
    ),
  }));

  const payables = allPayables.filter((payable) => {
    const displayStatus = getPayableStatus(payable);
    const matchesStatus = status === "all" || displayStatus === status;
    const searchable = [
      payable.person_name,
      payable.item_name,
      payable.reason,
      payable.notes,
      payable.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchesSearch = !searchTerm || searchable.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const totals = allPayables.reduce(
    (acc, payable) => {
      const displayStatus = getPayableStatus(payable);
      acc.total += Number(payable.original_value ?? 0);
      acc.remaining += Number(payable.remaining_amount ?? 0);
      acc.paid += Number(payable.paid_amount ?? 0);
      acc.counts[displayStatus] = (acc.counts[displayStatus] ?? 0) + 1;
      return acc;
    },
    {
      total: 0,
      paid: 0,
      remaining: 0,
      counts: {} as Record<string, number>,
    },
  );

  const paramsFor = (value: string) => {
    const params = new URLSearchParams();
    if (value !== "all") params.set("status", value);
    if (searchTerm) params.set("search", search);
    const query = params.toString();
    return query ? `/dashboard/payables?${query}` : "/dashboard/payables";
  };

  const statCards = [
    {
      label: "Total Value",
      value: totals.total,
      icon: WalletCards,
      tone: "info" as const,
      valueClassName: "text-text-primary",
    },
    {
      label: "Already Paid",
      value: totals.paid,
      icon: CheckCircle2,
      tone: "success" as const,
      valueClassName: "text-success",
    },
    {
      label: "Still Remaining",
      value: totals.remaining,
      icon: Clock3,
      tone: "warning" as const,
      valueClassName: "text-warning",
    },
  ];

  return (
    <div className="space-y-5 pb-8">
      <div className="page-heading finance-surface-glass overflow-hidden">
        <div className="flex min-w-0 gap-3">
          <span className="finance-icon-container mt-0.5" data-size="lg" data-tone="warning">
            <HandCoins size={20} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-warning">
              <Banknote size={14} />
              Money Tools
            </div>
            <h2 className="page-title mt-2">Payables</h2>
            <p className="page-subtitle">
              Track borrowed money, items, return deadlines, and repayment history.
            </p>
          </div>
        </div>
        <AddPayableButton />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {statCards.map(({ label, value, icon: Icon, tone, valueClassName }) => (
          <div key={label} className="summary-card finance-hover-lift min-h-[118px] min-w-0">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-secondary">{label}</p>
                <p className={`mt-2 break-words text-xl font-bold [overflow-wrap:anywhere] ${valueClassName}`}>
                  <Money amount={value} counted />
                </p>
              </div>
              <span className="finance-icon-container" data-size="sm" data-tone={tone}>
                <Icon size={16} />
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="finance-panel p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-[18px] border border-border bg-surface-secondary p-1">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value || (!status && tab.value === "all");
              const count =
                tab.value === "all" ? allPayables.length : totals.counts[tab.value] ?? 0;
              return (
                <Link
                  key={tab.value}
                  href={paramsFor(tab.value)}
                  className={`finance-focus min-w-max rounded-[14px] px-3 py-2 text-center text-xs font-semibold transition-all ${
                    active ?
                      "bg-card text-text-primary shadow-[var(--shadow-xs)]"
                    : "text-text-secondary hover:bg-hover hover:text-text-primary"
                  }`}
                >
                  {tab.label} <span className="opacity-70">({count})</span>
                </Link>
              );
            })}
          </div>

          <form className="finance-control finance-search-control flex min-h-11 w-full min-w-0 items-center gap-2 px-3 xl:w-96">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <Search size={15} className="shrink-0 text-text-secondary" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search person, item, reason, or notes..."
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
            />
          </form>
        </div>
      </div>

      {payables.length === 0 ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={HandCoins}
            title="No payable records found"
            description={
              allPayables.length ?
                "Try a different person, item, reason, or status filter."
              : "Add the first person or item you need to return and track every repayment."
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {payables.map((payable) => {
            const displayStatus = getPayableStatus(payable);
            return (
              <div key={payable.id} className="relative">
                <div
                  className={`pointer-events-none absolute left-3 top-3 h-2 w-2 rounded-full ${
                    displayStatus === "overdue" ? "bg-danger"
                    : displayStatus === "completed" ? "bg-success"
                    : displayStatus === "partial" ? "bg-info"
                    : "bg-warning"
                  }`}
                />
                <PayableCard payable={payable} accounts={accounts ?? []} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
