"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import AddGoalButton from "@/components/goals/AddGoalButton";
import AddIncomeButton from "@/components/income/AddIncomeButton";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";

type LauncherKind = "income" | "expense" | "investment" | "goal";
type EmptyCardKind =
  | "cash-flow"
  | "investments"
  | "spending-breakdown"
  | "spend-record"
  | "goals"
  | "transactions";

type EmptyStateConfig = {
  kind: EmptyCardKind;
  cardLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  launcher: LauncherKind;
};

const EMPTY_STATE_CONFIGS: EmptyStateConfig[] = [
  {
    kind: "cash-flow",
    cardLabel: "income vs expenses",
    title: "No transactions yet",
    description:
      "Add your first transaction to see income and expense trends here.",
    actionLabel: "Add a transaction",
    launcher: "income",
  },
  {
    kind: "investments",
    cardLabel: "investments",
    title: "No investments yet",
    description:
      "Add your first investment to see portfolio allocation here.",
    actionLabel: "Add an investment",
    launcher: "investment",
  },
  {
    kind: "spending-breakdown",
    cardLabel: "spending breakdown",
    title: "No expenses yet",
    description:
      "Add your first expense to see spending categories here.",
    actionLabel: "Add an expense",
    launcher: "expense",
  },
  {
    kind: "spend-record",
    cardLabel: "spend record",
    title: "No expenses yet",
    description: "Add your first expense to see spending trends here.",
    actionLabel: "Add an expense",
    launcher: "expense",
  },
  {
    kind: "goals",
    cardLabel: "goals progress",
    title: "No goals yet",
    description: "Create your first goal to see savings progress here.",
    actionLabel: "Create a goal",
    launcher: "goal",
  },
  {
    kind: "transactions",
    cardLabel: "recent transactions",
    title: "No transactions yet",
    description:
      "Add your first transaction to see recent account activity here.",
    actionLabel: "Add a transaction",
    launcher: "income",
  },
];

function getCardHeadingText(section: HTMLElement) {
  return Array.from(section.querySelectorAll<HTMLElement>("h3, header span"))
    .map((element) => element.textContent?.trim().toLowerCase() ?? "")
    .filter(Boolean)
    .join(" ");
}

function getEmptyCopyElements(emptyState: HTMLElement) {
  const title =
    emptyState.querySelector<HTMLElement>("[data-empty-state-title]") ??
    emptyState.querySelector<HTMLElement>("p");
  const paragraphs = Array.from(emptyState.querySelectorAll<HTMLElement>("p"));
  const description =
    emptyState.querySelector<HTMLElement>("[data-empty-state-description]") ??
    paragraphs.find((paragraph) => paragraph !== title) ??
    null;

  return { title, description };
}

export default function DashboardEmptyStateSync() {
  const [mounted, setMounted] = useState(false);
  const launchersRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;

    const launcherButtons =
      launchersRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-dashboard-empty-launcher] > button",
      );

    launcherButtons?.forEach((button) => {
      button.tabIndex = -1;
      button.setAttribute("aria-hidden", "true");
    });

    const openLauncher = (launcher: LauncherKind) => {
      launchersRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-dashboard-empty-launcher="${launcher}"] > button`,
        )
        ?.click();
    };

    const synchronizeEmptyStates = () => {
      const overview = document.querySelector<HTMLElement>(".dashboard-overview");
      if (!overview) return;

      overview.querySelectorAll<HTMLElement>("section").forEach((section) => {
        delete section.dataset.dashboardEmptyCard;

        const headingText = getCardHeadingText(section);
        const config = EMPTY_STATE_CONFIGS.find((item) =>
          headingText.includes(item.cardLabel),
        );
        if (!config) return;

        const emptyState = section.querySelector<HTMLElement>(
          ".dashboard-chart-empty",
        );
        if (!emptyState) return;

        const { title, description } = getEmptyCopyElements(emptyState);
        const currentTitle = title?.textContent?.trim().toLowerCase() ?? "";
        if (!title || !description || currentTitle.includes("unavailable")) return;

        section.dataset.dashboardEmptyCard = config.kind;

        if (title.textContent !== config.title) title.textContent = config.title;
        if (description.textContent !== config.description) {
          description.textContent = config.description;
        }

        const reusableEmptyState = emptyState.querySelector<HTMLElement>(
          "[data-empty-state]",
        );
        reusableEmptyState?.setAttribute("data-empty-state-has-action", "true");

        let actionContainer = emptyState.querySelector<HTMLElement>(
          "[data-empty-state-action]",
        );
        let actionButton =
          actionContainer?.querySelector<HTMLButtonElement>("button");

        if (!actionContainer) {
          actionContainer = document.createElement("div");
          actionContainer.setAttribute("data-empty-state-action", "");
          const content =
            emptyState.querySelector<HTMLElement>("[data-empty-state-content]") ??
            title.parentElement ??
            emptyState;
          content.appendChild(actionContainer);
        }

        if (!actionButton) {
          actionButton = document.createElement("button");
          actionButton.type = "button";
          actionButton.className = "finance-focus";
          actionButton.setAttribute(
            "data-dashboard-empty-action",
            config.launcher,
          );
          actionButton.addEventListener("click", () =>
            openLauncher(config.launcher),
          );
          actionContainer.appendChild(actionButton);
        }

        if (actionButton.textContent !== config.actionLabel) {
          actionButton.textContent = config.actionLabel;
        }
      });
    };

    synchronizeEmptyStates();

    let frame = 0;
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(synchronizeEmptyStates);
    });

    const overview = document.querySelector<HTMLElement>(".dashboard-overview");
    if (overview) {
      observer.observe(overview, { childList: true, subtree: true });
    }

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [mounted]);

  if (!mounted) return null;

  return createPortal(
    <>
      <style>{`
        [data-dashboard-empty-launcher] > button {
          position: fixed !important;
          left: -10000px !important;
          top: -10000px !important;
          width: 1px !important;
          height: 1px !important;
          min-width: 1px !important;
          min-height: 1px !important;
          overflow: hidden !important;
          padding: 0 !important;
          border: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .dashboard-overview
          section[data-dashboard-empty-card="cash-flow"]
          [aria-label="Cash-flow range"],
        .dashboard-overview
          section[data-dashboard-empty-card="investments"]
          .dashboard-card-view-link {
          display: none !important;
        }

        .dashboard-overview
          section[data-dashboard-empty-card="spend-record"]
          .pt-1 {
          display: none !important;
        }

        .dashboard-overview
          section[data-dashboard-empty-card="spend-record"]
          .dashboard-chart-empty {
          height: auto !important;
          min-height: 0 !important;
          flex: 1 1 auto !important;
          margin-top: 0 !important;
        }
      `}</style>
      <div ref={launchersRef} data-dashboard-empty-launchers>
        <div data-dashboard-empty-launcher="income">
          <AddIncomeButton label="Add income" showIcon={false} />
        </div>
        <div data-dashboard-empty-launcher="expense">
          <AddExpenseButton label="Add an expense" showIcon={false} />
        </div>
        <div data-dashboard-empty-launcher="investment">
          <AddInvestmentButton label="Add an investment" showIcon={false} />
        </div>
        <div data-dashboard-empty-launcher="goal">
          <AddGoalButton label="Create a goal" showIcon={false} />
        </div>
      </div>
    </>,
    document.body,
  );
}
