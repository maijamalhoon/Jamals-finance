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
} from "@/components/icons/jalvoro/compat";

import { useCurrency } from "@/components/currency/CurrencyProvider";
import CountedAmount from "@/components/motion/CountedAmount";
import type { DashboardBalanceSummary } from "@/lib/dashboard-financial-semantics";

const LIVE_PORTFOLIO_EVENT = "jamals:live-portfolio-value";

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

type LivePortfolioEvent = CustomEvent<{ delta?: number }>;

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
  const [portfolioDelta, setPortfolioDelta] = useState(0);
  const resolvedBalance =
    summary.value === null ? null : summary.value + portfolioDelta;
  const displayTotalBalance =
    resolvedBalance === null ? "Unavailable" : formatCurrency(resolvedBalance);
  const balanceSize = getBalanceSize(displayTotalBalance);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  const [transactionType, setTransactionType] =
    useState<TransactionType>("income");

  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);

  useEffect(() => {
    const target = window as Window & { __jamalsLivePortfolioDelta?: number };
    const initialDelta = Number(target.__jamalsLivePortfolioDelta ?? 0);
    if (Number.isFinite(initialDelta)) setPortfolioDelta(initialDelta);

    function handleLivePortfolio(event: Event) {
      const nextDelta = Number((event as LivePortfolioEvent).detail?.delta ?? 0);
      if (Number.isFinite(nextDelta)) setPortfolioDelta(nextDelta);
    }

    window.addEventListener(LIVE_PORTFOLIO_EVENT, handleLivePortfolio);
    return () =>
      window.removeEventListener(LIVE_PORTFOLIO_EVENT, handleLivePortfolio);
  }, []);

  useEffect(() => {
    const actionsElement = quickActionsRef.current;
    if (!actionsElement) return;

    const compactViewport = window.matchMedia("(max-width: 639px)");
    let animationFrame = 0;

    const alignToVisualViewport = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (!compactViewport.matches) {
          actionsElement.style.removeProperty("--quick-actions-center-offset");
          delete actionsElement.dataset.centerOffset;
          return;
        }

        const rect = actionsElement.getBoundingClientRect();
        const visualViewport = window.visualViewport;
        const viewportLeft = visualViewport?.offsetLeft ?? 0;
        const viewportWidth = visualViewport?.width ?? window.innerWidth;
        const targetCenter = viewportLeft + viewportWidth / 2;
        const currentCenter = rect.left + rect.width / 2;
        const correction = targetCenter - currentCenter;

        if (Math.abs(correction) < 0.25) return;

        const currentOffset = Number(actionsElement.dataset.centerOffset ?? "0");
        const nextOffset = currentOffset + correction;
        actionsElement.dataset.centerOffset = String(nextOffset);
        actionsElement.style.setProperty(
          "--quick-actions-center-offset",
          `${nextOffset}px`,
        );
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(alignToVisualViewport);

    resizeObserver?.observe(actionsElement);
    compactViewport.addEventListener("change", alignToVisualViewport);
    window.addEventListener("resize", alignToVisualViewport, { passive: true });
    window.visualViewport?.addEventListener("resize", alignToVisualViewport, {
      passive: true,
    });
    window.visualViewport?.addEventListener("scroll", alignToVisualViewport, {
      passive: true,
    });
    alignToVisualViewport();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      compactViewport.removeEventListener("change", alignToVisualViewport);
      window.removeEventListener("resize", alignToVisualViewport);
      window.visualViewport?.removeEventListener(
        "resize",
        alignToVisualViewport,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        alignToVisualViewport,
      );
    };
  }, []);

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
              className="dashboard-balance-amount max-w-full whitespace-nowrap font-black text-text-primary tabular-nums"
              data-balance-size={balanceSize}
              title={displayTotalBalance}
            >
              {resolvedBalance === null ? (
                displayTotalBalance
              ) : (
                <CountedAmount
                  amount={displayTotalBalance}
                  duration={0.65}
                  animateOnCompact
                />
              )}
            </h2>
          </div>

          <div
            ref={quickActionsRef}
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
