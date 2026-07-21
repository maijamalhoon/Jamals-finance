"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";

import type {
  NewUserExperienceCounts,
  NewUserExperienceState,
} from "@/lib/new-user-experience";

const AccountModal = dynamic(
  () => import("@/components/accounts/AccountModal"),
  { ssr: false },
);
const NewUserSetupGuide = dynamic(
  () => import("@/components/dashboard/NewUserSetupGuide"),
  { ssr: false },
);
const TransactionModal = dynamic(
  () => import("@/components/dashboard/TransactionModal"),
  { ssr: false },
);
const GoalModal = dynamic(() => import("@/components/goals/GoalModal"), {
  ssr: false,
});
const InvestmentModal = dynamic(
  () => import("@/components/investments/InvestmentModal"),
  { ssr: false },
);
const PayableModal = dynamic(
  () => import("@/components/payables/PayableModal"),
  { ssr: false },
);

type ActionKind =
  | "account"
  | "income"
  | "expense"
  | "transaction"
  | "investment"
  | "goal"
  | "payable";

type DataKind =
  | "accounts"
  | "income"
  | "expenses"
  | "transactions"
  | "investments"
  | "goals"
  | "payables"
  | "financial"
  | "any";

type NewUserPageConfig = {
  title: string;
  description: string;
  actionLabel: string;
  action: ActionKind;
  dataKind: DataKind;
};

const SETUP_STORAGE_KEY = "jamals-finance-new-user-setup-dismissed";

// New-user-only presentation is centralized here. A future wording, spacing,
// typography or action-size change can be made once and will apply everywhere.
const NEW_USER_ACTION_CLASS =
  "finance-focus mt-5 inline-flex min-h-10 items-center justify-center bg-transparent px-1 text-sm font-black text-primary transition-[color,transform,opacity] duration-200 hover:opacity-80 active:scale-[0.98] sm:text-base";

const NEW_USER_PAGE_CONFIG: Record<string, NewUserPageConfig> = {
  accounts: {
    title: "No accounts yet",
    description: "Add your first account to see balances and activity here.",
    actionLabel: "Add an account",
    action: "account",
    dataKind: "accounts",
  },
  income: {
    title: "No income yet",
    description: "Add your first income to see account totals and activity here.",
    actionLabel: "Add income",
    action: "income",
    dataKind: "income",
  },
  expenses: {
    title: "No expenses yet",
    description: "Add your first expense to see spending activity here.",
    actionLabel: "Add an expense",
    action: "expense",
    dataKind: "expenses",
  },
  investments: {
    title: "No investments yet",
    description: "Add your first investment to see portfolio allocation here.",
    actionLabel: "Add an investment",
    action: "investment",
    dataKind: "investments",
  },
  goals: {
    title: "No goals yet",
    description: "Create your first goal to see savings progress here.",
    actionLabel: "Create a goal",
    action: "goal",
    dataKind: "goals",
  },
  payables: {
    title: "No payables yet",
    description: "Add your first payable to see repayment progress here.",
    actionLabel: "Add a payable",
    action: "payable",
    dataKind: "payables",
  },
  transactions: {
    title: "No transactions yet",
    description: "Add your first transaction to see account activity here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "transactions",
  },
  analytics: {
    title: "No analytics yet",
    description: "Add your first transaction to see financial analytics here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
  },
  reports: {
    title: "No reports yet",
    description: "Add your first transaction to create financial reports here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
  },
  "ai-insights": {
    title: "No insights yet",
    description:
      "Add your first transaction to see personalized financial insights here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
  },
  insights: {
    title: "No insights yet",
    description:
      "Add your first transaction to see personalized financial insights here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
  },
};

function titleFromSegment(segment: string) {
  return segment
    .split("-")
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function fallbackConfig(segment: string): NewUserPageConfig {
  const title = titleFromSegment(segment) || "Page";
  return {
    title: `No ${title.toLowerCase()} yet`,
    description: `Add your first transaction to see ${title.toLowerCase()} here.`,
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "any",
  };
}

function hasPageData(dataKind: DataKind, counts: NewUserExperienceCounts) {
  const transactionActivity = counts.totalTransactions + counts.transfers;
  const financialActivity =
    transactionActivity + counts.investments + counts.goals + counts.payables;
  const anyActivity = financialActivity + counts.accounts;

  if (dataKind === "accounts") return counts.accounts > 0;
  if (dataKind === "income") return counts.incomeTransactions > 0;
  if (dataKind === "expenses") return counts.expenseTransactions > 0;
  if (dataKind === "transactions") return transactionActivity > 0;
  if (dataKind === "investments") return counts.investments > 0;
  if (dataKind === "goals") return counts.goals > 0;
  if (dataKind === "payables") return counts.payables > 0;
  if (dataKind === "financial") return financialActivity > 0;
  return anyActivity > 0;
}

export default function NewUserExperienceGate({
  children,
  state,
}: {
  children: ReactNode;
  state: NewUserExperienceState;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeAction, setActiveAction] = useState<ActionKind | null>(null);
  const [setupGuideReady, setSetupGuideReady] = useState(false);
  const isDashboard = pathname === "/dashboard" || pathname === "/dashboard/";
  const isSettings = pathname.startsWith("/dashboard/settings");
  const routeSegment = pathname.split("/").filter(Boolean)[1] ?? "";
  const pageConfig = useMemo(
    () => NEW_USER_PAGE_CONFIG[routeSegment] ?? fallbackConfig(routeSegment),
    [routeSegment],
  );

  useLayoutEffect(() => {
    if (isDashboard && state.available && state.setupActive) {
      localStorage.removeItem(SETUP_STORAGE_KEY);
    }
    setSetupGuideReady(true);
  }, [isDashboard, state.available, state.setupActive]);

  if (!state.available || !state.setupActive || isSettings) {
    return children;
  }

  if (isDashboard) {
    return (
      <div data-new-user-dashboard-setup className="w-full pb-12">
        <style>{`
          [data-new-user-dashboard-setup]
            button[aria-label="Dismiss setup guide"] {
            display: none !important;
          }
        `}</style>
        {setupGuideReady ? <NewUserSetupGuide counts={state.counts} /> : null}
      </div>
    );
  }

  if (hasPageData(pageConfig.dataKind, state.counts)) {
    return children;
  }

  const finishAction = () => {
    setActiveAction(null);
    router.refresh();
  };
  const transactionType = activeAction === "expense" ? "expense" : "income";
  const transactionAction =
    activeAction === "income" ||
    activeAction === "expense" ||
    activeAction === "transaction";

  return (
    <>
      <section
        data-new-user-page
        className="flex min-h-[calc(100dvh-8rem)] w-full min-w-0 flex-col pb-10"
      >
        <div className="flex min-h-[24rem] flex-1 items-center justify-center px-4 py-12 text-center sm:min-h-[30rem]">
          <div className="mx-auto flex w-full max-w-xl flex-col items-center">
            <h2 className="text-base font-black leading-tight text-text-primary sm:text-lg">
              {pageConfig.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary sm:text-base">
              {pageConfig.description}
            </p>
            <button
              type="button"
              onClick={() => setActiveAction(pageConfig.action)}
              className={NEW_USER_ACTION_CLASS}
            >
              {pageConfig.actionLabel}
            </button>
          </div>
        </div>
      </section>

      {activeAction === "account" ? (
        <AccountModal open onClose={() => setActiveAction(null)} onSuccess={finishAction} />
      ) : null}
      {transactionAction ? (
        <TransactionModal
          open
          defaultType={transactionType}
          onClose={() => setActiveAction(null)}
          onSuccess={finishAction}
        />
      ) : null}
      {activeAction === "investment" ? (
        <InvestmentModal
          open
          onClose={() => setActiveAction(null)}
          onSuccess={finishAction}
        />
      ) : null}
      {activeAction === "goal" ? (
        <GoalModal open onClose={() => setActiveAction(null)} onSuccess={finishAction} />
      ) : null}
      {activeAction === "payable" ? (
        <PayableModal
          open
          onClose={() => {
            setActiveAction(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
