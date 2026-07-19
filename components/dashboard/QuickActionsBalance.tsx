"use client";

import { useEffect, useRef, useState } from "react";
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
  icon: LucideIcon;
  ariaLabel: string;
  tone: "income" | "expense" | "transfer" | "investment";
}> = [
  {
    key: "income",
    icon: ArrowUp,
    ariaLabel: "Add income",
    tone: "income",
  },
  {
    key: "expense",
    icon: ArrowDown,
    ariaLabel: "Add expense",
    tone: "expense",
  },
  {
    key: "transfer",
    icon: ArrowUpDown,
    ariaLabel: "Transfer money",
    tone: "transfer",
  },
  {
    key: "invest",
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
  const launchCleanupRef = useRef<(() => void) | null>(null);

  const [transactionType, setTransactionType] =
    useState<TransactionType>("income");

  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);

  useEffect(() => {
    return () => launchCleanupRef.current?.();
  }, []);

  function prepareFormLaunch(trigger: HTMLButtonElement) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    launchCleanupRef.current?.();

    const triggerRect = trigger.getBoundingClientRect();
    const originX = triggerRect.left + triggerRect.width / 2;
    const originY = triggerRect.top + triggerRect.height / 2;
    const root = document.documentElement;
    let modal: HTMLElement | null = null;
    let finishTimer = 0;
    let fallbackTimer = 0;

    root.setAttribute("data-quick-action-launch-pending", "true");

    const observer = new MutationObserver(() => attachLaunchAnimation());

    const cleanup = () => {
      observer.disconnect();
      window.clearTimeout(finishTimer);
      window.clearTimeout(fallbackTimer);
      root.removeAttribute("data-quick-action-launch-pending");

      if (modal) {
        modal.classList.remove("quick-action-form-launch");
        modal.style.removeProperty("--quick-action-launch-x");
        modal.style.removeProperty("--quick-action-launch-y");
      }

      if (launchCleanupRef.current === cleanup) {
        launchCleanupRef.current = null;
      }
    };

    function attachLaunchAnimation() {
      const openModals = document.querySelectorAll<HTMLElement>(
        '[data-slot="dialog-content"].finance-modal-content',
      );
      const nextModal = openModals.item(openModals.length - 1);
      if (!nextModal) return;

      modal = nextModal;
      const modalRect = modal.getBoundingClientRect();
      modal.style.setProperty(
        "--quick-action-launch-x",
        `${originX - modalRect.left}px`,
      );
      modal.style.setProperty(
        "--quick-action-launch-y",
        `${originY - modalRect.top}px`,
      );
      modal.classList.add("quick-action-form-launch");
      root.removeAttribute("data-quick-action-launch-pending");
      observer.disconnect();
      window.clearTimeout(fallbackTimer);
      finishTimer = window.setTimeout(cleanup, 720);
    }

    launchCleanupRef.current = cleanup;
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-open"],
    });
    queueMicrotask(attachLaunchAnimation);
    fallbackTimer = window.setTimeout(cleanup, 2500);
  }

  function openAction(action: QuickAction, trigger: HTMLButtonElement) {
    prepareFormLaunch(trigger);

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
              className="dashboard-balance-amount max-w-full whitespace-nowrap font-black text-text-primary tabular-nums"
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
                  data-action={action.key}
                  onClick={(event) =>
                    openAction(action.key, event.currentTarget)
                  }
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
