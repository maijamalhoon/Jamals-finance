"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HandCoins,
  RotateCcw,
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
      className="finance-focus inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--oneui-button-radius)] bg-surface-secondary px-3 text-xs font-black text-text-primary transition-all hover:bg-hover"
    >
      {children}
      <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
    </Link>
  );
}

function SetupRow({ step, featured = false }: { step: SetupStep; featured?: boolean }) {
  return (
    <li
      className={`flex min-w-0 flex-col gap-3 rounded-[var(--oneui-tile-radius)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between ${
        featured ? "bg-primary-soft" : "bg-surface-secondary"
      }`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span
          className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
            featured ? "bg-primary-soft text-primary" : "bg-card text-text-secondary"
          }`}
        >
          {step.icon}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-sm font-black leading-5 text-text-primary">{step.title}</p>
            {featured ? (
              <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-black uppercase tracking-normal text-primary">
                Next
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs leading-5 text-text-secondary">{step.detail}</p>
        </div>
      </div>

      <div className="flex shrink-0 justify-start sm:justify-end">{step.action}</div>
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
  const [expanded, setExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>("income");
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
    setExpanded(false);
  }

  function restoreGuide() {
    localStorage.removeItem(STORAGE_KEY);
    setDismissed(false);
  }

  const steps: SetupStep[] = [
    {
      id: "account",
      title: counts.accounts > 0 ? "First account added" : "Add your first account",
      detail:
        counts.accounts > 0
          ? `${counts.accounts} account${counts.accounts === 1 ? "" : "s"} ready for tracking.`
          : "Start with a real cash or bank balance.",
      complete: counts.accounts > 0,
      icon: <WalletCards aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionButton onClick={() => setAccountOpen(true)}>Add account</SetupActionButton>
      ),
    },
    {
      id: "income-categories",
      title: counts.incomeCategories > 0 ? "Income categories ready" : "Add income categories",
      detail:
        counts.incomeCategories > 0
          ? `${counts.incomeCategories} income categor${counts.incomeCategories === 1 ? "y" : "ies"} available.`
          : "Keep income records organized from day one.",
      complete: counts.incomeCategories > 0,
      icon: <Tags aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionLink href="/dashboard/settings" ariaLabel="Customize income categories">
          Customize
        </SetupActionLink>
      ),
    },
    {
      id: "expense-categories",
      title: counts.expenseCategories > 0 ? "Expense categories ready" : "Add expense categories",
      detail:
        counts.expenseCategories > 0
          ? `${counts.expenseCategories} expense categor${counts.expenseCategories === 1 ? "y" : "ies"} available.`
          : "Make spending reports useful immediately.",
      complete: counts.expenseCategories > 0,
      icon: <Tags aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionLink href="/dashboard/settings" ariaLabel="Customize expense categories">
          Customize
        </SetupActionLink>
      ),
    },
    {
      id: "income",
      title: counts.incomeTransactions > 0 ? "First income recorded" : "Add your first income",
      detail:
        counts.incomeTransactions > 0
          ? `${counts.incomeTransactions} income entr${counts.incomeTransactions === 1 ? "y" : "ies"} saved.`
          : "Log salary, business, freelance, or other money in.",
      complete: counts.incomeTransactions > 0,
      icon: <TrendingUp aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionButton onClick={() => openTransaction("income")} tone="income">
          Add income
        </SetupActionButton>
      ),
    },
    {
      id: "expense",
      title: counts.expenseTransactions > 0 ? "First expense recorded" : "Add your first expense",
      detail:
        counts.expenseTransactions > 0
          ? `${counts.expenseTransactions} expense entr${counts.expenseTransactions === 1 ? "y" : "ies"} saved.`
          : "Capture a bill, purchase, or everyday spend.",
      complete: counts.expenseTransactions > 0,
      icon: <TrendingDown aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <SetupActionButton onClick={() => openTransaction("expense")} tone="expense">
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
      action: <SetupActionLink href="/dashboard/payables">Explore payables</SetupActionLink>,
    },
    {
      id: "planning",
      title: hasPlanningStep ? "Planning started" : "Add a goal or investment",
      detail:
        hasPlanningStep
          ? `${counts.goals + counts.investments} planning item${counts.goals + counts.investments === 1 ? "" : "s"} active.`
          : "Give your dashboard something future-facing.",
      complete: hasPlanningStep,
      optional: true,
      icon: <Target aria-hidden="true" className="h-4.5 w-4.5" />,
      action: (
        <div className="flex flex-wrap gap-2">
          <SetupActionLink href="/dashboard/goals">Add goal</SetupActionLink>
          <SetupActionLink href="/dashboard/investments">Add investment</SetupActionLink>
        </div>
      ),
    },
  ];

  const incompleteCoreSteps = steps.filter((step) => !step.complete && !step.optional);
  const visibleSteps = incompleteCoreSteps.slice(0, 3);
  const optionalSteps = steps.filter((step) => step.optional && !step.complete);
  const nextStep = visibleSteps[0] ?? optionalSteps[0] ?? null;

  if (!earlyUser || !hydrated) {
    return null;
  }

  if (dismissed) {
    return (
      <section
        aria-label="New user setup guide dismissed"
        className="flex min-h-10 flex-wrap items-center justify-between gap-2 px-1 py-1"
      >
        <p className="text-xs text-text-muted">
          Setup hidden · {completedMainSteps} of {mainSteps.length} complete
        </p>
        <button
          type="button"
          onClick={restoreGuide}
          className="finance-focus inline-flex min-h-9 items-center justify-center gap-2 rounded-[var(--oneui-button-radius)] px-2.5 text-xs font-black text-primary transition-all hover:bg-primary-soft"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          Resume setup
        </button>
      </section>
    );
  }

  return (
    <>
      <section
        aria-labelledby="new-user-setup-title"
        className="finance-panel overflow-hidden px-4 py-3.5 sm:px-5 sm:py-4"
      >
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              {nextStep?.icon ?? <CheckCircle2 aria-hidden="true" className="h-4.5 w-4.5" />}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <h2 id="new-user-setup-title" className="text-sm font-black text-text-primary">
                  Setup progress
                </h2>
                <span className="text-xs font-black text-primary">{progress}%</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-text-secondary sm:whitespace-normal">
                {nextStep ? `Next: ${nextStep.title}` : "Your essential setup is complete."}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:justify-end">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
              className="finance-focus inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-[var(--oneui-button-radius)] bg-primary px-3 text-xs font-black text-primary-foreground transition-all hover:bg-primary-hover sm:flex-none"
            >
              {expanded ? "Hide steps" : "Continue setup"}
              {expanded ? (
                <ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              aria-label="Dismiss setup guide"
              onClick={dismissGuide}
              className="finance-focus grid h-10 w-10 shrink-0 place-items-center rounded-full text-text-secondary transition-all hover:bg-hover hover:text-text-primary"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-secondary"
          role="progressbar"
          aria-label={`${completedMainSteps} of ${mainSteps.length} core setup steps complete`}
          aria-valuemin={0}
          aria-valuemax={mainSteps.length}
          aria-valuenow={completedMainSteps}
        >
          <span
            className="block h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        {expanded ? (
          <div className="mt-4 border-t border-border/60 pt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-text-muted">
                  Recommended next steps
                </p>
                <p className="mt-1 text-xs leading-5 text-text-secondary">
                  Complete one task at a time. Progress updates from your saved records.
                </p>
              </div>
              <span className="text-xs font-black text-text-secondary">
                {completedMainSteps}/{mainSteps.length} complete
              </span>
            </div>

            <ul className="grid gap-2">
              {visibleSteps.map((setupStep, index) => (
                <SetupRow key={setupStep.id} step={setupStep} featured={index === 0} />
              ))}
            </ul>

            {incompleteCoreSteps.length > visibleSteps.length ? (
              <p className="mt-3 text-center text-xs text-text-muted">
                {incompleteCoreSteps.length - visibleSteps.length} more core step
                {incompleteCoreSteps.length - visibleSteps.length === 1 ? "" : "s"} will appear next.
              </p>
            ) : null}
          </div>
        ) : null}
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
