"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import type { DashboardBalanceSummary } from "@/lib/dashboard-financial-semantics";

const TransferModal = dynamic(() => import("@/components/accounts/TransferModal"), {
  ssr: false,
});
const TransactionModal = dynamic(
  () => import("@/components/dashboard/TransactionModal"),
  { ssr: false },
);
const InvestmentModal = dynamic(
  () => import("@/components/investments/InvestmentModal"),
  { ssr: false },
);

type TransactionType = "income" | "expense";
type QuickAction = TransactionType | "transfer" | "invest";

const actions: Array<{
  key: QuickAction;
  label: string;
  icon: LucideIcon;
  ariaLabel: string;
  tone: "income" | "expense" | "transfer" | "investment";
}> = [
  {
    key: "income",
    label: "Income",
    icon: ArrowUp,
    ariaLabel: "Add income",
    tone: "income",
  },
  {
    key: "expense",
    label: "Expense",
    icon: ArrowDown,
    ariaLabel: "Add expense",
    tone: "expense",
  },
  {
    key: "transfer",
    label: "Transfer",
    icon: ArrowUpDown,
    ariaLabel: "Transfer money",
    tone: "transfer",
  },
  {
    key: "invest",
    label: "Invest",
    icon: TrendingUp,
    ariaLabel: "Add investment",
    tone: "investment",
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

            <h2 className="max-w-full break-words text-[clamp(2rem,4vw,4rem)] font-black leading-[0.98] tracking-[-0.05em] text-text-primary tabular-nums [overflow-wrap:anywhere]">
              {displayTotalBalance}
            </h2>
            <p className="mt-3 max-w-2xl text-xs leading-5 text-text-secondary sm:text-sm sm:leading-6">
              {summary.description}
            </p>
          </div>

          <div
            role="group"
            aria-label="Quick actions"
            className="grid w-full grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-1 lg:w-auto lg:min-w-[360px]"
          >
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.key}
                  type="button"
                  aria-label={action.ariaLabel}
                  title={action.ariaLabel}
                  onClick={() => openAction(action.key)}
                  className="dashboard-quick-action finance-focus group"
                >
                  <span
                    data-tone={action.tone}
                    className="finance-feature-accent grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border shadow-[var(--shadow-xs)] transition-[background-color,border-color,transform] duration-200 group-hover:-translate-y-0.5 group-active:translate-y-0"
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5"
                      strokeWidth={2.2}
                    />
                  </span>

                  <span className="max-w-full truncate text-xs font-bold text-text-primary">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {transactionOpen ? (
        <TransactionModal
          open
          defaultType={transactionType}
          onClose={() => setTransactionOpen(false)}
          onSuccess={() => {
            setTransactionOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {transferOpen ? (
        <TransferModal
          open
          onClose={() => setTransferOpen(false)}
          onSuccess={() => {
            setTransferOpen(false);
            router.refresh();
          }}
        />
      ) : null}

      {investmentOpen ? (
        <InvestmentModal
          open
          onClose={() => setInvestmentOpen(false)}
          onSuccess={() => {
            setInvestmentOpen(false);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
