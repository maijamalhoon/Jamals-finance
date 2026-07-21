"use client";

import { useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import AccountModal from "@/components/accounts/AccountModal";
import NewUserSetupGuide from "@/components/dashboard/NewUserSetupGuide";
import TransactionModal from "@/components/dashboard/TransactionModal";
import GoalModal from "@/components/goals/GoalModal";
import InvestmentModal from "@/components/investments/InvestmentModal";
import PayableModal from "@/components/payables/PayableModal";
import type {
  NewUserExperienceCounts,
  NewUserExperienceState,
} from "@/lib/new-user-experience";

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
  label: string;
  title: string;
  description: string;
  actionLabel: string;
  action: ActionKind;
  dataKind: DataKind;
  accent: string;
};

const SETUP_STORAGE_KEY = "jamals-finance-new-user-setup-dismissed";

// New-user-only presentation is centralized here. A future wording, spacing,
// typography or action-size change can be made once and will apply everywhere.
const NEW_USER_ACTION_CLASS =
  "finance-focus mt-5 inline-flex min-h-10 items-center justify-center bg-transparent px-1 text-sm font-black text-primary transition-[color,transform,opacity] duration-200 hover:opacity-80 active:scale-[0.98] sm:text-base";

const NEW_USER_PAGE_CONFIG: Record<string, NewUserPageConfig> = {
  accounts: {
    label: "Accounts",
    title: "No accounts yet",
    description: "Add your first account to see balances and activity here.",
    actionLabel: "Add an account",
    action: "account",
    dataKind: "accounts",
    accent: "var(--info)",
  },
  income: {
    label: "Income",
    title: "No income yet",
    description: "Add your first income to see account totals and activity here.",
    actionLabel: "Add income",
    action: "income",
    dataKind: "income",
    accent: "var(--income)",
  },
  expenses: {
    label: "Expenses",
    title: "No expenses yet",
    description: "Add your first expense to see spending activity here.",
    actionLabel: "Add an expense",
    action: "expense",
    dataKind: "expenses",
    accent: "var(--expense)",
  },
  investments: {
    label: "Investments",
    title: "No investments yet",
    description: "Add your first investment to see portfolio allocation here.",
    actionLabel: "Add an investment",
    action: "investment",
    dataKind: "investments",
    accent: "var(--investment)",
  },
  goals: {
    label: "Goals",
    title: "No goals yet",
    description: "Create your first goal to see savings progress here.",
    actionLabel: "Create a goal",
    action: "goal",
    dataKind: "goals",
    accent: "var(--goals)",
  },
  payables: {
    label: "Payables",
    title: "No payables yet",
    description: "Add your first payable to see repayment progress here.",
    actionLabel: "Add a payable",
    action: "payable",
    dataKind: "payables",
    accent: "var(--payables)",
  },
  transactions: {
    label: "Transactions",
    title: "No transactions yet",
    description: "Add your first transaction to see account activity here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "transactions",
    accent: "var(--info)",
  },
  analytics: {
    label: "Analytics",
    title: "No analytics yet",
    description: "Add your first transaction to see financial analytics here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
    accent: "var(--primary)",
  },
  reports: {
    label: "Reports",
    title: "No reports yet",
    description: "Add your first transaction to create financial reports here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
    accent: "var(--primary)",
  },
  "ai-insights": {
    label: "AI Insights",
    title: "No insights yet",
    description:
      "Add your first transaction to see personalized financial insights here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
    accent: "var(--primary)",
  },
  insights: {
    label: "AI Insights",
    title: "No insights yet",
    description:
      "Add your first transaction to see personalized financial insights here.",
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "financial",
    accent: "var(--primary)",
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
  const label = titleFromSegment(segment) || "Page";
  return {
    label,
    title: `No ${label.toLowerCase()} yet`,
    description: `Add your first transaction to see ${label.toLowerCase()} here.`,
    actionLabel: "Add a transaction",
    action: "transaction",
    dataKind: "any",
    accent: "var(--primary)",
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

  return (
    <>
      <section
        data-new-user-page
        className="flex min-h-[calc(100dvh-8rem)] w-full min-w-0 flex-col pb-10"
      >
        <div className="flex min-h-10 items-center gap-3">
          <span
            aria-hidden="true"
            className="h-7 w-1 shrink-0 rounded-full"
            style={{ background: pageConfig.accent }}
          />
          <h1 className="m-0 text-[clamp(1rem,0.8rem+0.55vw,1.45rem)] font-[760] leading-tight tracking-[-0.025em] text-text-primary">
            {pageConfig.label}
          </h1>
        </div>

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

      <AccountModal
        open={activeAction === "account"}
        onClose={() => setActiveAction(null)}
        onSuccess={finishAction}
      />
      <TransactionModal
        open={
          activeAction === "income" ||
          activeAction === "expense" ||
          activeAction === "transaction"
        }
        defaultType={transactionType}
        onClose={() => setActiveAction(null)}
        onSuccess={finishAction}
      />
      <InvestmentModal
        open={activeAction === "investment"}
        onClose={() => setActiveAction(null)}
        onSuccess={finishAction}
      />
      <GoalModal
        open={activeAction === "goal"}
        onClose={() => setActiveAction(null)}
        onSuccess={finishAction}
      />
      <PayableModal
        open={activeAction === "payable"}
        onClose={() => {
          setActiveAction(null);
          router.refresh();
        }}
      />
    </>
  );
}
