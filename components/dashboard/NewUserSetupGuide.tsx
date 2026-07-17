"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  RotateCcw,
  Sparkles,
  HandCoins,
  Tags,
  Target,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
} from "lucide-react";

import AccountModal from "@/components/accounts/AccountModal";
import TransactionModal from "@/components/dashboard/TransactionModal";

type SetupCounts = {
  accounts: number;
  incomeTransactions: number;
  expenseTransactions: number;
  incomeCategories: number;
  expenseCategories: number;
  goals: number;
  investments: number;
};

type TransactionType = "income" | "expense";

type SetupStep = {
  id: string;
  title: string;
  detail: string;
  complete: boolean;
  optional?: boolean;
  icon: ReactNode;
  action: ReactNode;
};

const STORAGE_KEY = "jamals-finance-new-user-setup-dismissed";

function SetupActionButton({
  children,
  onClick,
  tone = "neutral",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "income" | "expense" | "neutral";
}) {
  const toneClass =
    tone === "income" ? "success-action"
    : tone === "expense" ? "danger-action"
    : "primary-action";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`finance-focus min-h-10 whitespace-nowrap px-3 text-xs font-black ${toneClass}`}
    >
      {children}
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </button>
  );
}

function SetupActionLink({
  children,
  href,
  ariaLabel,
}: {
  children: ReactNode;
  href: string;
  ariaLabel?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className="finance-focus inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--oneui-button-radius)] border border-border bg-surface-secondary px-3 text-xs font-black text-text-primary transition-all hover:bg-hover"
    >
      {children}
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );
}

function SetupRow({ step }: { step: SetupStep }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 border-t border-border/70 py-3 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
            step.complete ?
              "border-success/25 bg-success-soft text-success"
            : "border-border bg-surface-secondary text-text-secondary"
          }`}
        >
          {step.complete ?
            <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5" />
          : step.icon}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-sm font-black leading-5 text-text-primary">
              {step.title}
            </p>
            {step.optional && (
              <span className="rounded-full border border-border bg-surface-secondary px-2 py-0.5 text-[10px] font-black uppercase tracking-normal text-text-secondary">
                Optional
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-5 text-text-secondary">
            {step.detail}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 justify-start sm:justify-end">
        {step.complete ?
          <span className="inline-flex min-h-10 items-center gap-2 rounded-[var(--oneui-button-radius)] border border-success/25 bg-success-soft px-3 text-xs font-black text-success">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            Done
          </span>
        : step.action}
      </div>
    </li>
  );
}

export default function NewUserSetupGuide({
  counts,
}: {
  counts: SetupCounts;
}) {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transactionType, setTransactionType] =
    useState<TransactionType>("income");
  const [transactionOpen, setTransactionOpen] = useState(false);

  const earlyUser =
    counts.accounts === 0 ||
    counts.incomeTransactions === 0 ||
    counts.expenseTransactions === 0;

  const mainSteps = useMemo(
    () => [
      counts.accounts > 0,
      counts.incomeCategories > 0,
      counts.expenseCategories > 0,
      counts.incomeTransactions > 0,
      counts.expenseTransactions > 0,
    ],
    [counts],
  );

  const completedMainSteps = mainSteps.filter(Boolean).length;
  const progress = Math.round((completedMainSteps / mainSteps.length) * 100);
  const hasPlanningStep = counts.goals > 0 || counts.investments > 0;

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
    setHydrated(true);
  }, []);

  function openTransaction(type: TransactionType) {
    setTransactionType(type);
    setTransactionOpen(true);
  }

  function dismissGuide() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  function restoreGuide() {
    localStorage.removeItem(STORAGE_KEY);
    setDismissed(false);
  }

  const steps: SetupStep[] = [
    {
      id: "account",
      title:
        counts.accounts > 0 ? "First account added" : "Add your first account",
      detail:
        counts.accounts > 0 ?
          `${counts.accounts} account${counts.accounts === 1 ? "" : "s"} ready for tracking.`
        : "Start with cash, bank, wallet, or card balance.",
      complete: counts.accounts > 0,
      icon: <WalletCards aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionButton onClick={() => setAccountOpen(true)}>
          Add account
        </SetupActionButton>
      ),
    },
    {
      id: "income-categories",
      title:
        counts.incomeCategories > 0 ?
          "Income categories ready"
        : "Add income categories",
      detail:
        counts.incomeCategories > 0 ?
          `${counts.incomeCategories} income categor${counts.incomeCategories === 1 ? "y" : "ies"} available.`
        : "Keep income entries clean from day one.",
      complete: counts.incomeCategories > 0,
      icon: <Tags aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionLink
          href="/dashboard/settings"
          ariaLabel="Customize income categories"
        >
          Customize
        </SetupActionLink>
      ),
    },
    {
      id: "expense-categories",
      title:
        counts.expenseCategories > 0 ?
          "Expense categories ready"
        : "Add expense categories",
      detail:
        counts.expenseCategories > 0 ?
          `${counts.expenseCategories} expense categor${counts.expenseCategories === 1 ? "y" : "ies"} available.`
        : "Make spending reports useful immediately.",
      complete: counts.expenseCategories > 0,
      icon: <Tags aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionLink
          href="/dashboard/settings"
          ariaLabel="Customize expense categories"
        >
          Customize
        </SetupActionLink>
      ),
    },
    {
      id: "income",
      title:
        counts.incomeTransactions > 0 ?
          "First income recorded"
        : "Add first income",
      detail:
        counts.incomeTransactions > 0 ?
          `${counts.incomeTransactions} income entr${counts.incomeTransactions === 1 ? "y" : "ies"} saved.`
        : "Log salary, business, freelance, or any money in.",
      complete: counts.incomeTransactions > 0,
      icon: <TrendingUp aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionButton
          onClick={() => openTransaction("income")}
          tone="income"
        >
          Add income
        </SetupActionButton>
      ),
    },
    {
      id: "expense",
      title:
        counts.expenseTransactions > 0 ?
          "First expense recorded"
        : "Add first expense",
      detail:
        counts.expenseTransactions > 0 ?
          `${counts.expenseTransactions} expense entr${counts.expenseTransactions === 1 ? "y" : "ies"} saved.`
        : "Capture a bill, purchase, or daily spend.",
      complete: counts.expenseTransactions > 0,
      icon: <TrendingDown aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionButton
          onClick={() => openTransaction("expense")}
          tone="expense"
        >
          Add expense
        </SetupActionButton>
      ),
    },
    {
      id: "payables",
      title: "Review payables",
      detail: "Track money owed, due dates, partial payments, and reminders.",
      complete: false,
      optional: true,
      icon: <HandCoins aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionLink href="/dashboard/payables">
          Explore payables
        </SetupActionLink>
      ),
    },
    {
      id: "planning",
      title:
        hasPlanningStep ? "Planning started" : "Add a goal or investment",
      detail:
        hasPlanningStep ?
          `${counts.goals + counts.investments} planning item${counts.goals + counts.investments === 1 ? "" : "s"} active.`
        : "Give your dashboard something future-facing.",
      complete: hasPlanningStep,
      optional: true,
      icon: <Target aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <div className="flex flex-wrap gap-2">
          <SetupActionLink href="/dashboard/goals">Add goal</SetupActionLink>
          <SetupActionLink href="/dashboard/investments">
            Add investment
          </SetupActionLink>
        </div>
      ),
    },
  ];

  if (!earlyUser || !hydrated) {
    return null;
  }

  if (dismissed) {
    return (
      <section
        aria-label="New user setup guide dismissed"
        className="finance-surface-soft flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0">
          <p className="text-sm font-black text-text-primary">
            Setup guide hidden
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            {completedMainSteps} of {mainSteps.length} core steps complete.
          </p>
        </div>
        <button
          type="button"
          onClick={restoreGuide}
          className="finance-focus inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--oneui-button-radius)] border border-border bg-card px-3 text-xs font-black text-text-primary transition-all hover:bg-hover"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Restore guide
        </button>
      </section>
    );
  }

  return (
    <>
      <section
        aria-labelledby="new-user-setup-title"
        className="finance-panel relative overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-income via-primary to-payables"
        />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 lg:max-w-[360px]">
            <div className="mb-3 flex items-center gap-2">
              <span className="finance-feature-accent grid h-9 w-9 shrink-0 place-items-center rounded-full border" data-tone="transfer">
                <Sparkles aria-hidden="true" className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  New user setup
                </p>
                <h2
                  id="new-user-setup-title"
                  className="text-xl font-black tracking-normal text-text-primary"
                >
                  Make Jamal&apos;s Finance yours
                </h2>
              </div>
            </div>

            <p className="text-sm leading-6 text-text-secondary">
              A quick checklist to unlock accurate balances, charts, and daily
              money flow.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div
                aria-label={`${completedMainSteps} of ${mainSteps.length} core setup steps complete`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={mainSteps.length}
                aria-valuenow={completedMainSteps}
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
                style={{
                  background: `conic-gradient(var(--active) ${progress}%, color-mix(in srgb, var(--border), transparent 30%) 0)`,
                }}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full border border-border bg-card text-sm font-black text-text-primary">
                  {progress}%
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-text-primary">
                  {completedMainSteps} of {mainSteps.length} core steps done
                </p>
                <p className="mt-0.5 text-xs leading-5 text-text-secondary">
                  Dismiss anytime; restore is available while setup is still
                  incomplete.
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-text-muted">
                Checklist
              </p>
              <button
                type="button"
                aria-label="Dismiss setup guide"
                onClick={dismissGuide}
                className="finance-focus grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-surface-secondary text-text-secondary transition-all hover:bg-hover hover:text-text-primary"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <ul className="min-w-0">
              {steps.map((step) => (
                <SetupRow key={step.id} step={step} />
              ))}
            </ul>

            <div className="mt-3 flex items-start gap-2 rounded-[var(--oneui-tile-radius)] border border-border bg-surface-secondary px-3 py-2 text-xs leading-5 text-text-secondary">
              <Circle
                aria-hidden="true"
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-text-muted"
              />
              <span>
                Completed steps are based on your saved records, not this
                month only.
              </span>
            </div>
          </div>
        </div>
      </section>

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        onSuccess={() => {
          setAccountOpen(false);
          router.refresh();
        }}
      />

      <TransactionModal
        open={transactionOpen}
        defaultType={transactionType}
        onClose={() => setTransactionOpen(false)}
        onSuccess={() => {
          setTransactionOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}
