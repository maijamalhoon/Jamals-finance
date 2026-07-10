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
  totalBalance,
}: {
  totalBalance: number | string;
}) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const displayTotalBalance =
    typeof totalBalance === "number" ? formatCurrency(totalBalance) : totalBalance;

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
        className="finance-reference-card jf-balance-card relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-blue-500 via-emerald-500 to-orange-500"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/4 top-0 h-24 w-64 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 text-center lg:text-left">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-text-secondary">
              Total net balance
            </p>

            <h1 className="max-w-full break-words text-[clamp(2.05rem,4.1vw,4.15rem)] font-black leading-[0.96] tracking-tight text-text-primary [font-variant-numeric:tabular-nums] [overflow-wrap:anywhere] lg:max-w-[13ch] xl:max-w-[15ch]">
              {displayTotalBalance}
            </h1>
          </div>

          <div className="mx-auto grid w-full max-w-[480px] grid-cols-4 gap-2.5 lg:mx-0 lg:w-auto lg:min-w-[392px] lg:gap-3">
            {actions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.key}
                  type="button"
                  aria-label={action.ariaLabel}
                  onClick={() => openAction(action.key)}
                  className="finance-focus group flex min-w-0 flex-col items-center justify-center gap-2 rounded-[var(--oneui-control-radius)] border border-transparent px-1 py-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border hover:bg-card/60 focus-visible:bg-card/70"
                >
                  <span
                    className={`grid h-11 w-11 place-items-center rounded-full border shadow-sm transition-all duration-200 group-hover:shadow-lg sm:h-12 sm:w-12 lg:h-14 lg:w-14 ${action.circleClass}`}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5 stroke-[2.5] lg:h-6 lg:w-6"
                    />
                  </span>

                  <span className="truncate text-[11px] font-black lowercase tracking-[-0.03em] text-text-primary sm:text-xs">
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
