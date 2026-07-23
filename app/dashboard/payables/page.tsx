import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HandCoins,
  Search,
  WalletCards,
} from "@/components/icons/jalvoro/compat";

import Money from "@/components/currency/Money";
import AddPayableButton from "@/components/payables/AddPayableButton";
import PayableCard, { type Payable } from "@/components/payables/PayableCard";
import EmptyState from "@/components/ui/empty-state";
import { getPayableStatus } from "@/lib/finance-options";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Partial", value: "partial" },
  { label: "Overdue", value: "overdue" },
  { label: "Completed", value: "completed" },
] as const;

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function safePositive(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function PayablesPulse({
  total,
  paid,
  remaining,
  count,
  overdueCount,
}: {
  total: number;
  paid: number;
  remaining: number;
  count: number;
  overdueCount: number;
}) {
  const repaymentPct = total > 0 ? Math.min(Math.max((paid / total) * 100, 0), 100) : 0;
  const progressOffset =
    CIRCUMFERENCE - (repaymentPct / 100) * CIRCUMFERENCE;
  const metrics = [
    {
      label: "Total value",
      value: total,
      helper: `${count} ${count === 1 ? "payable" : "payables"}`,
      icon: WalletCards,
      tone: "var(--text-primary)",
    },
    {
      label: "Already paid",
      value: paid,
      helper: `${repaymentPct.toFixed(1)}% settled`,
      icon: CheckCircle2,
      tone: "var(--success)",
    },
    {
      label: "Still remaining",
      value: remaining,
      helper:
        overdueCount > 0
          ? `${overdueCount} ${overdueCount === 1 ? "overdue" : "overdue"}`
          : "No overdue balance",
      icon: Clock3,
      tone: overdueCount > 0 ? "var(--danger)" : "var(--warning)",
    },
  ];

  return (
    <section
      data-payables-pulse
      aria-label="Payables repayment overview"
      className="grid min-w-0 gap-5 overflow-hidden rounded-[30px] bg-card p-4 sm:p-5 lg:grid-cols-[minmax(15rem,0.78fr)_minmax(0,1.22fr)] lg:items-center lg:p-6"
    >
      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <div
          className="relative size-28 shrink-0 sm:size-32"
          role="progressbar"
          aria-label="Payables repayment progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(repaymentPct)}
        >
          <svg
            className="size-full -rotate-90"
            viewBox="0 0 120 120"
            aria-hidden="true"
          >
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--surface-secondary)"
              strokeWidth="9"
            />
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="var(--payables, var(--warning))"
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={progressOffset}
              className="payables-progress-ring"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-xl font-black tabular-nums tracking-tight text-text-primary sm:text-2xl">
                {repaymentPct.toFixed(1)}%
              </p>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
                Repaid
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-payables">
            Repayment pulse
          </p>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-text-primary sm:text-xl">
            Payables at a glance
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-5 text-text-secondary">
            Track what is settled, what remains, and which payments need attention.
          </p>
        </div>
      </div>

      <dl className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3">
        {metrics.map(({ label, value, helper, icon: Icon, tone }) => (
          <div
            key={label}
            className="min-w-0 rounded-[20px] bg-surface-primary/45 px-3.5 py-4 sm:px-4"
          >
            <div className="flex items-center gap-2">
              <Icon
                aria-hidden="true"
                size={16}
                strokeWidth={2.35}
                style={{ color: tone }}
              />
              <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-tertiary">
                {label}
              </dt>
            </div>
            <dd
              className="mt-2 break-words text-base font-bold tabular-nums [overflow-wrap:anywhere] sm:text-lg"
              style={{ color: tone }}
            >
              <Money amount={value} />
            </dd>
            <p className="mt-1 truncate text-[11px] text-text-secondary">
              {helper}
            </p>
          </div>
        ))}
      </dl>
    </section>
  );
}

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { status = "all", search = "" } = await searchParams;
  const normalizedStatus = STATUS_TABS.some((tab) => tab.value === status)
    ? status
    : "all";
  const supabase = await createClient();
  const searchTerm = search.trim().toLowerCase();

  const [payablesResult, accountsResult] = await Promise.all([
    supabase
      .from("liabilities")
      .select(
        "*, liability_payments!liability_payments_liability_owner_fkey(*, accounts!liability_payments_account_owner_fkey(name, type))",
      )
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name, type")
      .eq("status", "active")
      .order("name"),
  ]);

  const { data: rawPayables, error: payablesError } = payablesResult;
  const { data: accounts, error: accountsError } = accountsResult;

  if (payablesError) {
    console.error("Failed to load payables", { code: payablesError.code });
  }
  if (accountsError) {
    console.error("Failed to load payable accounts", {
      code: accountsError.code,
    });
  }

  const allPayables = payablesError
    ? []
    : ((rawPayables ?? []) as Payable[]).map((payable) => ({
        ...payable,
        liability_payments: [...(payable.liability_payments ?? [])].sort((a, b) =>
          b.paid_at.localeCompare(a.paid_at),
        ),
      }));

  const payables = allPayables.filter((payable) => {
    const displayStatus = getPayableStatus(payable);
    const matchesStatus =
      normalizedStatus === "all" || displayStatus === normalizedStatus;
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
      acc.total += safePositive(payable.original_value);
      acc.remaining += safePositive(payable.remaining_amount);
      acc.paid += safePositive(payable.paid_amount);
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
    <div data-payables-page className="space-y-4 pb-8 sm:space-y-5">
      <div data-page-action-row className="flex justify-end">
        <AddPayableButton />
      </div>

      {payablesError ? (
        <div className="finance-panel min-h-[220px] px-4 sm:px-5">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load payables"
            description="Refresh the page or try again after checking your connection."
          />
        </div>
      ) : allPayables.length === 0 ? (
        <div className="py-3 sm:py-6">
          <EmptyState
            icon={HandCoins}
            title="No payables yet"
            description="Add your first payable to see repayment progress here."
            action={<AddPayableButton />}
          />
        </div>
      ) : (
        <>
          <PayablesPulse
            total={totals.total}
            paid={totals.paid}
            remaining={totals.remaining}
            count={allPayables.length}
            overdueCount={totals.counts.overdue ?? 0}
          />

          {accountsError ? (
            <div
              role="status"
              className="finance-panel-soft flex items-start gap-3 p-4 text-sm text-text-secondary"
            >
              <AlertTriangle
                aria-hidden="true"
                size={18}
                strokeWidth={2.35}
                className="mt-0.5 shrink-0 text-warning"
              />
              <p>
                Payables are available, but payment accounts could not be loaded.
                Refresh before recording a payment.
              </p>
            </div>
          ) : null}

          <div
            data-payables-filter
            className="rounded-[24px] bg-card p-2.5 sm:p-3"
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <nav
                aria-label="Filter payables by status"
                className="grid grid-cols-2 gap-1 rounded-[18px] bg-surface-secondary/65 p-1 min-[420px]:grid-cols-3 sm:grid-cols-5"
              >
                {STATUS_TABS.map((tab) => {
                  const active = normalizedStatus === tab.value;
                  const count =
                    tab.value === "all"
                      ? allPayables.length
                      : totals.counts[tab.value] ?? 0;
                  return (
                    <Link
                      key={tab.value}
                      href={paramsFor(tab.value)}
                      aria-current={active ? "page" : undefined}
                      className={`finance-focus flex min-h-11 min-w-0 items-center justify-center rounded-[14px] px-2 py-2 text-center text-xs font-semibold leading-4 transition-[background-color,color,transform] duration-200 active:scale-[0.98] ${
                        active
                          ? "bg-card text-text-primary"
                          : "text-text-secondary hover:bg-hover hover:text-text-primary"
                      }`}
                    >
                      {tab.label}{" "}
                      <span className="ml-1 opacity-65">{count}</span>
                    </Link>
                  );
                })}
              </nav>

              <form className="finance-control finance-search-control flex min-h-11 w-full min-w-0 items-center gap-2 px-3 xl:w-96">
                {normalizedStatus !== "all" ? (
                  <input
                    type="hidden"
                    name="status"
                    value={normalizedStatus}
                  />
                ) : null}
                <Search
                  size={16}
                  strokeWidth={2.35}
                  className="shrink-0 text-text-secondary"
                  aria-hidden="true"
                />
                <label htmlFor="payables-search" className="sr-only">
                  Search payables
                </label>
                <input
                  id="payables-search"
                  type="search"
                  name="search"
                  defaultValue={search}
                  placeholder="Search person, item, reason, or notes"
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                />
              </form>
            </div>
          </div>

          {payables.length === 0 ? (
            <div className="finance-panel px-5">
              <EmptyState
                icon={HandCoins}
                title="No payables found"
                description="Try a different person, item, reason, or status filter."
              />
            </div>
          ) : (
            <div data-payables-list className="space-y-3 sm:space-y-4">
              {payables.map((payable) => {
                const displayStatus = getPayableStatus(payable);
                return (
                  <div
                    key={payable.id}
                    data-payable-item
                    data-status={displayStatus}
                    className="relative min-w-0"
                  >
                    <PayableCard payable={payable} accounts={accounts ?? []} />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
