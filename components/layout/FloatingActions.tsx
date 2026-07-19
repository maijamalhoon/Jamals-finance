"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowLeftRight,
  BarChart2,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const TransferModal = dynamic(() => import("@/components/accounts/TransferModal"), {
  ssr: false,
});
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

type ActionKey = "income" | "expense" | "investment" | "transfer" | "goal";

const actions = [
  {
    key: "income",
    label: "Add Income",
    hint: "Record money in",
    icon: TrendingUp,
    iconTone: "bg-success/10 text-success ring-success/15",
  },
  {
    key: "expense",
    label: "Add Expense",
    hint: "Track spending",
    icon: TrendingDown,
    iconTone: "bg-danger/10 text-danger ring-danger/15",
  },
  {
    key: "investment",
    label: "Add Investment",
    hint: "Grow portfolio",
    icon: BarChart2,
    iconTone: "finance-investment-quick-icon",
  },
  {
    key: "transfer",
    label: "Transfer Money",
    hint: "Move between accounts",
    icon: ArrowLeftRight,
    iconTone: "bg-info/10 text-info ring-info/15",
  },
  {
    key: "goal",
    label: "Add Goal",
    hint: "Plan savings",
    icon: Target,
    iconTone: "bg-warning/10 text-warning ring-warning/15",
  },
] satisfies Array<{
  key: ActionKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  iconTone: string;
}>;

const motionEase = [0.16, 1, 0.3, 1] as const;

const menuVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
    scale: 0.975,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.18,
      ease: motionEase,
      staggerChildren: 0.025,
      delayChildren: 0.015,
    },
  },
  exit: {
    opacity: 0,
    y: 8,
    scale: 0.98,
    transition: {
      duration: 0.14,
      ease: motionEase,
    },
  },
};

const itemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 4,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.14,
      ease: motionEase,
    },
  },
  exit: {
    opacity: 0,
    y: 3,
    transition: {
      duration: 0.1,
      ease: motionEase,
    },
  },
};

export default function FloatingActions() {
  const router = useRouter();
  const pathname = usePathname();
  const available = pathname === "/dashboard/transactions";

  const [open, setOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const modalOpen =
    transactionOpen || transferOpen || goalOpen || investmentOpen || externalDialogOpen;

  useEffect(() => {
    if (!available) return;

    const updateDialogState = () => {
      setExternalDialogOpen(
        Boolean(document.querySelector('[data-slot="dialog-content"], [role="dialog"]')),
      );
    };

    updateDialogState();

    const observer = new MutationObserver(updateDialogState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [available]);

  useEffect(() => {
    if (available) return;

    setOpen(false);
    setTransactionOpen(false);
    setTransferOpen(false);
    setGoalOpen(false);
    setInvestmentOpen(false);
    setExternalDialogOpen(false);
  }, [available]);

  useEffect(() => {
    if (modalOpen) setOpen(false);
  }, [modalOpen]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  function handleAction(key: ActionKey) {
    setOpen(false);

    if (key === "income" || key === "expense") {
      setTxType(key);
      setTransactionOpen(true);
      return;
    }

    if (key === "investment") {
      setInvestmentOpen(true);
      return;
    }

    if (key === "transfer") {
      setTransferOpen(true);
      return;
    }

    setGoalOpen(true);
  }

  function refreshAfterSuccess() {
    router.refresh();
  }

  if (!available) return null;

  return (
    <>
      <div
        className={`jf-floating-actions fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-3 z-40 flex flex-col items-end gap-2.5 transition-all duration-200 print:hidden sm:right-5 lg:bottom-8 lg:right-8 ${
          modalOpen ? "pointer-events-none translate-y-2 opacity-0" : ""
        }`}
        aria-hidden={modalOpen ? "true" : undefined}
      >
        <AnimatePresence>
          {open && !modalOpen && (
            <>
              <motion.button
                type="button"
                aria-label="Close quick actions"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 -z-10 cursor-default bg-background/25 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-0"
              />

              <motion.div
                id="quick-finance-actions"
                role="menu"
                aria-label="Quick finance actions"
                variants={menuVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={[
                  "w-[252px] origin-bottom-right overflow-hidden rounded-[20px]",
                  "border border-border/70 bg-card/95 p-2 text-card-foreground",
                  "shadow-[var(--shadow-premium)] backdrop-blur-xl",
                ].join(" ")}
              >
                <div className="px-2.5 pb-1.5 pt-1">
                  <p className="text-[12px] font-semibold leading-5 tracking-[-0.01em] text-muted-foreground">
                    Quick actions
                  </p>
                </div>

                <div className="space-y-1">
                  {actions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <motion.button
                        key={action.key}
                        type="button"
                        role="menuitem"
                        variants={itemVariants}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => handleAction(action.key)}
                        className={[
                          "finance-focus group flex w-full items-center gap-3 rounded-[14px] px-2.5 py-2.5 text-left",
                          "bg-transparent transition-colors duration-150",
                          "hover:bg-muted/60 active:bg-muted/80 dark:hover:bg-surface-tinted",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ring-1 ring-inset",
                            "transition-transform duration-150 group-hover:scale-[1.03]",
                            action.iconTone,
                          ].join(" ")}
                        >
                          <Icon size={16} strokeWidth={2.15} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-nowrap text-[13px] font-semibold leading-4 tracking-[-0.01em] text-foreground">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block whitespace-nowrap text-[11px] font-medium leading-3.5 text-muted-foreground">
                            {action.hint}
                          </span>
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          aria-controls="quick-finance-actions"
          onClick={() => setOpen((current) => !current)}
          whileHover={{ y: -1, scale: 1.025 }}
          whileTap={{ scale: 0.94 }}
          transition={{
            type: "spring",
            stiffness: 380,
            damping: 24,
          }}
          className={[
            "finance-focus relative grid h-[54px] w-[54px] place-items-center rounded-full sm:h-[56px] sm:w-[56px]",
            "bg-active text-primary-foreground ring-1 ring-active/30 dark:ring-white/10",
            "shadow-[var(--shadow-lg)]",
            "transition-[filter,box-shadow] duration-200 hover:brightness-[1.03]",
          ].join(" ")}
        >
          <motion.span
            animate={{
              rotate: open ? 45 : 0,
              scale: open ? 0.94 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 360,
              damping: 24,
            }}
            className="relative z-10 grid place-items-center"
          >
            <Plus size={24} strokeWidth={2.35} />
          </motion.span>
        </motion.button>
      </div>

      {transactionOpen ? (
        <TransactionModal
          open
          defaultType={txType}
          onClose={() => setTransactionOpen(false)}
          onSuccess={() => {
            setTransactionOpen(false);
            refreshAfterSuccess();
          }}
        />
      ) : null}

      {transferOpen ? (
        <TransferModal
          open
          onClose={() => setTransferOpen(false)}
          onSuccess={refreshAfterSuccess}
        />
      ) : null}

      {goalOpen ? (
        <GoalModal
          open
          onClose={() => setGoalOpen(false)}
          onSuccess={refreshAfterSuccess}
        />
      ) : null}

      {investmentOpen ? (
        <InvestmentModal
          open
          onClose={() => setInvestmentOpen(false)}
          onSuccess={refreshAfterSuccess}
        />
      ) : null}
    </>
  );
}
