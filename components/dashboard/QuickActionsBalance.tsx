"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import TransferModal from "@/components/accounts/TransferModal";
import TransactionModal from "@/components/dashboard/TransactionModal";
import InvestmentModal from "@/components/investments/InvestmentModal";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { DashboardBalanceSummary } from "@/lib/dashboard-financial-semantics";

type TransactionType = "income" | "expense";
type QuickAction = TransactionType | "transfer" | "invest";

const actions: Array<{
  key: QuickAction;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
  circleClass: string;
}> = [
  {
    key: "income",
    label: "income",
    icon: ArrowUp,
    ariaLabel: "Add income",
    circleClass:
      "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:border-emerald-300 group-hover:bg-emerald-100 group-hover:shadow-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  },
  {
    key: "expense",
    label: "expense",
    icon: ArrowDown,
    ariaLabel: "Add expense",
    circleClass:
      "bg-rose-50 text-rose-600 border-rose-100 group-hover:border-rose-300 group-hover:bg-rose-100 group-hover:shadow-rose-500/15 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20",
  },
  {
    key: "transfer",
    label: "transfer",
    icon: ArrowUpDown,
    ariaLabel: "Transfer money",
    circleClass:
      "bg-blue-50 text-blue-600 border-blue-100 group-hover:border-blue-300 group-hover:bg-blue-100 group-hover:shadow-blue-500/15 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20",
  },
  {
    key: "invest",
    label: "invest",
    icon: TrendingUp,
    ariaLabel: "Add investment",
    circleClass:
      "bg-amber-50 text-amber-700 border-amber-100 group-hover:border-amber-300 group-hover:bg-amber-100 group-hover:shadow-amber-500/15 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/20",
  },
];

export default function QuickActionsBalance({
  summary,
}: {
  summary: DashboardBalanceSummary;
}) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const displayTotalBalance =
    summary.value === null ? "Unavailable" : formatCurrency(summary.value);

  const [transactionType, setTransactionType] =
    useState<TransactionType>("income");

  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);

  function openAction(action: QuickAction) {
    if (action === "income" || action === "expense") {
      setTransactionType(action);
      setTransactionOpen(true);
      return;
    }

    if (action === "transfer") {
      setTransferOpen(true);
      return;
    }

    setInvestmentOpen(true);
  }

  return (
    <>
      <section
        aria-label="Total net balance and quick actions"
        className="dashboard-balance-hero"
      >
        <div
          aria-hidden="true"
          className="dashboard-balance-accent"
        />
        <div
          aria-hidden="true"
          className="dashboard-balance-shape dashboard-balance-shape-one"
        />
        <div
          aria-hidden="true"
          className="dashboard-balance-shape dashboard-balance-shape-two"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 text-left lg:max-w-[58%]">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">
                {summary.label}
              </p>
              {summary.status !== "available" ? (
                <span className="dashboard-balance-status" data-status={summary.status}>
                  {summary.status === "partial" ? "Partial" : "Unavailable"}
                </span>
              ) : null}
            </div>

            <h1 className="max-w-full break-words text-[clamp(2rem,4vw,4rem)] font-black leading-[0.98] tracking-[-0.05em] text-text-primary tabular-nums [overflow-wrap:anywhere]">
              {displayTotalBalance}
            </h1>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-text-secondary sm:text-sm sm:leading-6">
              {summary.description}
            </p>
          </div>

          <div role="group" aria-label="Quick actions" className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 lg:w-auto lg:min-w-[392px]">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.key}
                  type="button"
                  aria-label={action.ariaLabel}
                  onClick={() => openAction(action.key)}
                  className="dashboard-quick-action finance-focus group"
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-[16px] border transition-colors duration-200 sm:h-12 sm:w-12 ${action.circleClass}`}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 stroke-[2.5] lg:h-6 lg:w-6"
                    />
                  </span>

                  <span className="max-w-full truncate text-[10px] font-bold capitalize text-text-primary sm:text-[11px]">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <TransactionModal
        open={transactionOpen}
        defaultType={transactionType}
        onClose={() => setTransactionOpen(false)}
        onSuccess={() => {
          setTransactionOpen(false);
          router.refresh();
        }}
      />

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={() => {
          setTransferOpen(false);
          router.refresh();
        }}
      />

      <InvestmentModal
        open={investmentOpen}
        onClose={() => setInvestmentOpen(false)}
        onSuccess={() => {
          setInvestmentOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
