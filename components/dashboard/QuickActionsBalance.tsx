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
import CountedAmount from "@/components/motion/CountedAmount";
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

function getBalanceSize(value: string) {
  if (value.length > 22) return "xlong";
  if (value.length > 16) return "long";
  return "normal";
}

export default function QuickActionsBalance({
  summary,
}: {
  summary: DashboardBalanceSummary;
}) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const displayTotalBalance =
    summary.value === null ? "Unavailable" : formatCurrency(summary.value);
  const balanceSize = getBalanceSize(displayTotalBalance);

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
        <div className="dashboard-balance-layout">
          <div className="dashboard-balance-copy">
            <div className="dashboard-balance-heading-row">
              <p className="dashboard-balance-label">{summary.label}</p>
              {summary.status !== "available" ? (
                <span className="dashboard-balance-status" data-status={summary.status}>
                  {summary.status === "partial" ? "Partial" : "Unavailable"}
                </span>
              ) : null}
            </div>

            <h2
              className="dashboard-balance-amount max-w-full break-words font-black text-text-primary tabular-nums [overflow-wrap:anywhere]"
              data-balance-size={balanceSize}
              title={displayTotalBalance}
            >
              {summary.value === null ? (
                displayTotalBalance
              ) : (
                <CountedAmount
                  amount={displayTotalBalance}
                  duration={1.65}
                  animateOnCompact
                />
              )}
            </h2>
            <p className="dashboard-balance-description">{summary.description}</p>
          </div>

          <div
            role="group"
            aria-label="Quick actions"
            className="dashboard-balance-actions"
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
                    className="finance-feature-accent dashboard-quick-action-icon"
                  >
                    <Icon
                      aria-hidden="true"
                      className="dashboard-quick-action-glyph"
                      strokeWidth={2.25}
                    />
                  </span>

                  <span className="dashboard-quick-action-label">{action.label}</span>
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
