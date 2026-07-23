"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const AddExpenseButton = dynamic(
  () => import("@/components/expenses/AddExpenseButton"),
  { ssr: false },
);
const AddGoalButton = dynamic(
  () => import("@/components/goals/AddGoalButton"),
  { ssr: false },
);
const AddIncomeButton = dynamic(
  () => import("@/components/income/AddIncomeButton"),
  { ssr: false },
);
const AddInvestmentButton = dynamic(
  () => import("@/components/investments/AddInvestmentButton"),
  { ssr: false },
);

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

const LAUNCHER_ORDER: LauncherKind[] = [
  "income",
  "expense",
  "investment",
  "goal",
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

function normalizeLaunchers(values: Iterable<LauncherKind>) {
  const unique = new Set(values);
  return LAUNCHER_ORDER.filter((launcher) => unique.has(launcher));
}

function sameLaunchers(left: LauncherKind[], right: LauncherKind[]) {
  return (
    left.length === right.length &&
    left.every((launcher, index) => launcher === right[index])
  );
}

export default function DashboardEmptyStateSync() {
  const [mounted, setMounted] = useState(false);
  const [activeLaunchers, setActiveLaunchers] = useState<LauncherKind[]>([]);
  const launchersRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;

    const overview = document.querySelector<HTMLElement>(".dashboard-overview");
    if (!overview) return;

    const updateActiveLaunchers = () => {
      const launchers = Array.from(
        overview.querySelectorAll<HTMLElement>("[data-dashboard-empty-action]"),
      ).flatMap((element) => {
        const launcher = element.dataset.dashboardEmptyAction;
        return LAUNCHER_ORDER.includes(launcher as LauncherKind)
          ? [launcher as LauncherKind]
          : [];
      });
      const next = normalizeLaunchers(launchers);
      setActiveLaunchers((current) =>
        sameLaunchers(current, next) ? current : next,
      );
    };

    const synchronizeSection = (section: HTMLElement) => {
      delete section.dataset.dashboardEmptyCard;

      const staleActions = () =>
        section
          .querySelectorAll<HTMLElement>(
            "[data-dashboard-empty-action-container]",
          )
          .forEach((element) => element.remove());

      const headingText = getCardHeadingText(section);
      const config = EMPTY_STATE_CONFIGS.find((item) =>
        headingText.includes(item.cardLabel),
      );
      if (!config) {
        staleActions();
        return;
      }

      const emptyState = section.querySelector<HTMLElement>(
        ".dashboard-chart-empty",
      );
      if (!emptyState) {
        staleActions();
        return;
      }

      const { title, description } = getEmptyCopyElements(emptyState);
      const currentTitle = title?.textContent?.trim().toLowerCase() ?? "";
      if (!title || !description || currentTitle.includes("unavailable")) {
        staleActions();
        return;
      }

      section.dataset.dashboardEmptyCard = config.kind;

      if (title.textContent !== config.title) title.textContent = config.title;
      if (description.textContent !== config.description) {
        description.textContent = config.description;
      }

      emptyState
        .querySelector<HTMLElement>("[data-empty-state]")
        ?.setAttribute("data-empty-state-has-action", "true");

      let actionContainer = emptyState.querySelector<HTMLElement>(
        "[data-empty-state-action]",
      );
      if (!actionContainer) {
        actionContainer = document.createElement("div");
        actionContainer.setAttribute("data-empty-state-action", "");
        const content =
          emptyState.querySelector<HTMLElement>("[data-empty-state-content]") ??
          title.parentElement ??
          emptyState;
        content.appendChild(actionContainer);
      }

      actionContainer.setAttribute(
        "data-dashboard-empty-action-container",
        config.launcher,
      );

      let actionButton =
        actionContainer.querySelector<HTMLButtonElement>("button");
      if (!actionButton) {
        actionButton = document.createElement("button");
        actionButton.type = "button";
        actionContainer.appendChild(actionButton);
      }

      actionButton.classList.add("finance-focus");
      actionButton.setAttribute("data-dashboard-empty-action", config.launcher);
      if (actionButton.textContent !== config.actionLabel) {
        actionButton.textContent = config.actionLabel;
      }
    };

    const synchronizeSections = (sections: Iterable<HTMLElement>) => {
      for (const section of sections) synchronizeSection(section);
      updateActiveLaunchers();
    };

    synchronizeSections(
      overview.querySelectorAll<HTMLElement>("section"),
    );

    const pendingSections = new Set<HTMLElement>();
    let frame = 0;

    const flushPendingSections = () => {
      frame = 0;
      const sections = Array.from(pendingSections);
      pendingSections.clear();
      synchronizeSections(sections);
    };

    const queueSection = (section: HTMLElement | null) => {
      if (!section || !overview.contains(section)) return;
      pendingSections.add(section);
      if (!frame) frame = window.requestAnimationFrame(flushPendingSections);
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof Element) {
          queueSection(mutation.target.closest<HTMLElement>("section"));
        }

        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches("section")) queueSection(node);
          node
            .querySelectorAll<HTMLElement>("section")
            .forEach((section) => queueSection(section));
        });
      }
    });

    const openLauncher = (launcher: LauncherKind, attempt = 0) => {
      const button = launchersRef.current?.querySelector<HTMLButtonElement>(
        `[data-dashboard-empty-launcher="${launcher}"] > button`,
      );
      if (button) {
        button.click();
        return;
      }

      setActiveLaunchers((current) =>
        current.includes(launcher)
          ? current
          : normalizeLaunchers([...current, launcher]),
      );

      if (attempt < 20) {
        window.setTimeout(() => openLauncher(launcher, attempt + 1), 50);
      }
    };

    const handleClick = (event: Event) => {
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest<HTMLElement>(
        "[data-dashboard-empty-action]",
      );
      if (!action || !overview.contains(action)) return;

      const launcher = action.dataset.dashboardEmptyAction;
      if (!LAUNCHER_ORDER.includes(launcher as LauncherKind)) return;
      openLauncher(launcher as LauncherKind);
    };

    overview.addEventListener("click", handleClick);
    observer.observe(overview, { childList: true, subtree: true });

    return () => {
      overview.removeEventListener("click", handleClick);
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      pendingSections.clear();
    };
  }, [mounted]);

  useLayoutEffect(() => {
    launchersRef.current
      ?.querySelectorAll<HTMLButtonElement>(
        "[data-dashboard-empty-launcher] > button",
      )
      .forEach((button) => {
        button.tabIndex = -1;
        button.setAttribute("aria-hidden", "true");
      });
  }, [activeLaunchers]);

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

        .dashboard-overview [data-dashboard-empty-action-container] {
          display: flex !important;
          width: 100% !important;
          align-items: center !important;
          justify-content: center !important;
          margin-top: 0.72rem !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        .dashboard-overview [data-dashboard-empty-action] {
          display: inline-flex !important;
          width: auto !important;
          min-width: 0 !important;
          min-height: 2rem !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0.38rem 0.28rem !important;
          border: 0 !important;
          background: transparent !important;
          color: var(--primary) !important;
          font-size: 0.68rem !important;
          font-weight: 760 !important;
          line-height: 1.1 !important;
          text-decoration: none !important;
          box-shadow: none !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          cursor: pointer !important;
        }

        .dashboard-overview [data-dashboard-empty-action]:hover {
          color: var(--primary-hover) !important;
          text-decoration: underline !important;
          text-underline-offset: 0.2em;
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
        {activeLaunchers.includes("income") ? (
          <div data-dashboard-empty-launcher="income">
            <AddIncomeButton label="Add income" showIcon={false} />
          </div>
        ) : null}
        {activeLaunchers.includes("expense") ? (
          <div data-dashboard-empty-launcher="expense">
            <AddExpenseButton label="Add an expense" showIcon={false} />
          </div>
        ) : null}
        {activeLaunchers.includes("investment") ? (
          <div data-dashboard-empty-launcher="investment">
            <AddInvestmentButton label="Add an investment" showIcon={false} />
          </div>
        ) : null}
        {activeLaunchers.includes("goal") ? (
          <div data-dashboard-empty-launcher="goal">
            <AddGoalButton label="Create a goal" showIcon={false} />
          </div>
        ) : null}
      </div>
    </>,
    document.body,
  );
}
