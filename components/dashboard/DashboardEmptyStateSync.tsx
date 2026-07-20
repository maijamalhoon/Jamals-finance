"use client";

import { useLayoutEffect, useRef } from "react";

import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import AddGoalButton from "@/components/goals/AddGoalButton";
import AddIncomeButton from "@/components/income/AddIncomeButton";
import AddInvestmentButton from "@/components/investments/AddInvestmentButton";

type LauncherKind = "income" | "expense" | "investment" | "goal";

type EmptyStateConfig = {
  cardLabel: string;
  title: string;
  description: string;
  actionLabel: string;
  launcher: LauncherKind;
};

const EMPTY_STATE_CONFIGS: EmptyStateConfig[] = [
  {
    cardLabel: "income vs expenses",
    title: "No cash flow yet",
    description: "Add your first income to see cash flow here.",
    actionLabel: "Add income",
    launcher: "income",
  },
  {
    cardLabel: "investments",
    title: "No investments yet",
    description: "Add your first investment to see portfolio allocation here.",
    actionLabel: "Add an investment",
    launcher: "investment",
  },
  {
    cardLabel: "spending breakdown",
    title: "No expenses yet",
    description: "Add your first expense to see spending categories here.",
    actionLabel: "Add an expense",
    launcher: "expense",
  },
  {
    cardLabel: "spend record",
    title: "No spending yet",
    description: "Add your first expense to see your spending record here.",
    actionLabel: "Add an expense",
    launcher: "expense",
  },
  {
    cardLabel: "goals progress",
    title: "No goals yet",
    description: "Create your first goal to see savings progress here.",
    actionLabel: "Create a goal",
    launcher: "goal",
  },
  {
    cardLabel: "recent transactions",
    title: "No transactions yet",
    description: "Add your first transaction to see account activity here.",
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
  const launchersRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const launcherButtons = launchersRef.current?.querySelectorAll<HTMLButtonElement>(
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

        if (title.textContent !== config.title) title.textContent = config.title;
        if (description.textContent !== config.description) {
          description.textContent = config.description;
        }

        let actionContainer = emptyState.querySelector<HTMLElement>(
          "[data-empty-state-action]",
        );
        let actionButton = actionContainer?.querySelector<HTMLButtonElement>("button");

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
          actionButton.setAttribute("data-dashboard-empty-action", config.launcher);
          actionButton.addEventListener("click", () => openLauncher(config.launcher));
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
  }, []);

  return (
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
    </>
  );
}
