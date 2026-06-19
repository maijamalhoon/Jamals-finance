import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AddPayableButton from "@/components/payables/AddPayableButton";
import PayableCard, { Payable } from "@/components/payables/PayableCard";
import EmptyState from "@/components/ui/empty-state";
import {
  formatPKR,
  getPayableStatus,
  PAYABLE_STATUS_META,
} from "@/lib/finance-options";
import { HandCoins, Search } from "lucide-react";

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
    supabase.from("accounts").select("id, name, type").order("name"),
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

  return (
    <div className="space-y-5 pb-8">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Payables</h2>
          <p className="page-subtitle">
            Track borrowed money, borrowed items, return deadlines, and complete
            payment history.
          </p>
        </div>
        <AddPayableButton />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="summary-card">
          <p className="text-xs text-slate-500">Total Value</p>
          <p className="mt-2 text-xl font-bold text-white">
            {formatPKR(totals.total)}
          </p>
        </div>
        <div className="summary-card border-emerald-300/12 bg-emerald-300/[0.055]">
          <p className="text-xs text-slate-500">Already Paid</p>
          <p className="mt-2 text-xl font-bold text-emerald-200">
            {formatPKR(totals.paid)}
          </p>
        </div>
        <div className="summary-card border-amber-300/12 bg-amber-300/[0.055]">
          <p className="text-xs text-slate-500">Still Remaining</p>
          <p className="mt-2 text-xl font-bold text-amber-200">
            {formatPKR(totals.remaining)}
          </p>
        </div>
      </div>

      <div className="finance-panel p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.045] p-1 sm:flex">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.value || (!status && tab.value === "all");
              const count =
                tab.value === "all" ? allPayables.length : totals.counts[tab.value] ?? 0;
              return (
                <Link
                  key={tab.value}
                  href={paramsFor(tab.value)}
                  className={`finance-focus rounded-xl px-3 py-2 text-center text-xs font-semibold transition-colors ${
                    active ?
                      "bg-cyan-300 text-slate-950"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {tab.label} <span className="opacity-70">({count})</span>
                </Link>
              );
            })}
          </div>

          <form className="finance-control flex min-h-11 w-full items-center gap-2 px-3 xl:w-96">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <Search size={15} className="text-slate-500" />
            <input
              name="search"
              defaultValue={search}
              placeholder="Search person, item, reason, or notes..."
              className="w-full bg-transparent text-sm text-white outline-none placeholder-slate-600"
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
            const meta = PAYABLE_STATUS_META[displayStatus];
            return (
              <div key={payable.id} className="relative">
                <div
                  className={`pointer-events-none absolute left-3 top-3 h-2 w-2 rounded-full ${
                    meta.className.includes("rose") ? "bg-rose-300"
                    : meta.className.includes("emerald") ? "bg-emerald-300"
                    : meta.className.includes("sky") ? "bg-sky-300"
                    : "bg-amber-300"
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
