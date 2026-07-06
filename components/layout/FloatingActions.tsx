"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

import TransferModal from "@/components/accounts/TransferModal";
import TransactionModal from "@/components/dashboard/TransactionModal";
import GoalModal from "@/components/goals/GoalModal";
import InvestmentModal from "@/components/investments/InvestmentModal";

type ActionKey = "income" | "expense" | "investment" | "transfer" | "goal";

const actions = [
  {
    key: "income",
    label: "Add Income",
    hint: "Record money in",
    icon: TrendingUp,
    tone: "text-emerald-600 dark:text-emerald-300",
    iconTone:
      "bg-emerald-500/10 text-emerald-600 ring-emerald-500/15 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/15",
  },
  {
    key: "expense",
    label: "Add Expense",
    hint: "Track spending",
    icon: TrendingDown,
    tone: "text-rose-600 dark:text-rose-300",
    iconTone:
      "bg-rose-500/10 text-rose-600 ring-rose-500/15 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/15",
  },
  {
    key: "investment",
    label: "Add Investment",
    hint: "Grow portfolio",
    icon: BarChart2,
    tone: "finance-investment-quick-dot",
    iconTone: "finance-investment-quick-icon",
  },
  {
    key: "transfer",
    label: "Transfer Money",
    hint: "Move between accounts",
    icon: ArrowLeftRight,
    tone: "text-sky-600 dark:text-sky-300",
    iconTone:
      "bg-sky-500/10 text-sky-600 ring-sky-500/15 dark:bg-sky-400/10 dark:text-sky-300 dark:ring-sky-400/15",
  },
  {
    key: "goal",
    label: "Add Goal",
    hint: "Plan savings",
    icon: Target,
    tone: "text-amber-600 dark:text-amber-300",
    iconTone:
      "bg-amber-500/10 text-amber-600 ring-amber-500/15 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/15",
  },
] satisfies Array<{
  key: ActionKey;
  label: string;
  hint: string;
  icon: LucideIcon;
  tone: string;
  iconTone: string;
}>;

const motionEase = [0.16, 1, 0.3, 1] as const;

const menuVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.96,
    filter: "blur(4px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.2,
      ease: motionEase,
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    y: 10,
    scale: 0.97,
    filter: "blur(4px)",
    transition: {
      duration: 0.16,
      ease: motionEase,
    },
  },
};

const itemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 6,
    x: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: {
      duration: 0.16,
      ease: motionEase,
    },
  },
  exit: {
    opacity: 0,
    y: 4,
    x: 4,
    transition: {
      duration: 0.12,
      ease: motionEase,
    },
  },
};

export default function FloatingActions() {
  const router = useRouter();

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
    const updateDialogState = () => {
      setExternalDialogOpen(
        Boolean(document.querySelector('[data-slot="dialog-content"], [role="dialog"]')),
      );
    };

    updateDialogState();

    const observer = new MutationObserver(updateDialogState);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (modalOpen) setOpen(false);
  }, [modalOpen]);

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

  return (
    <>
      <div
        className={`jf-floating-actions fixed bottom-[calc(6.85rem+env(safe-area-inset-bottom))] right-3 z-[55] flex flex-col items-end gap-3 transition-all duration-200 sm:right-5 lg:bottom-8 lg:right-8 ${
          modalOpen ? "pointer-events-none translate-y-2 opacity-0" : ""
        }`}
        aria-hidden={modalOpen ? "true" : undefined}
      >
        <AnimatePresence>
          {open && (
            <>
              <motion.button
                type="button"
                aria-label="Close quick actions"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 -z-10 cursor-default bg-background/40 backdrop-blur-[1px] lg:bg-transparent lg:backdrop-blur-0"
              />

              <motion.div
                role="group"
                aria-label="Quick finance actions"
                variants={menuVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className={[
                  "w-[236px] origin-bottom-right overflow-hidden rounded-[22px]",
                  "border border-border/80 bg-card/96 p-2.5 text-card-foreground",
                  "shadow-[0_20px_55px_rgba(15,23,42,0.14)] backdrop-blur-xl",
                  "dark:border-white/10 dark:bg-card/92 dark:shadow-[0_20px_55px_rgba(0,0,0,0.32)]",
                ].join(" ")}
              >
                <div className="mb-2 flex items-center justify-between px-2 pt-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Quick actions
                  </p>

                  <span className="h-1.5 w-1.5 rounded-full bg-active shadow-[0_0_0_4px_color-mix(in_srgb,var(--active),transparent_84%)]" />
                </div>

                <div className="space-y-1.5">
                  {actions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <motion.button
                        key={action.key}
                        type="button"
                        variants={itemVariants}
                        whileHover={{
                          x: -2,
                          y: -1,
                        }}
                        whileTap={{
                          scale: 0.985,
                        }}
                        onClick={() => handleAction(action.key)}
                        className={[
                          "finance-focus group flex w-full items-center gap-3 rounded-[16px] px-2.5 py-2.5 text-left",
                          "border border-transparent bg-transparent transition-all duration-200",
                          "hover:border-border hover:bg-muted/55 hover:shadow-[var(--shadow-soft)]",
                          "active:bg-muted/70 dark:hover:border-white/10 dark:hover:bg-white/[0.045]",
                        ].join(" ")}
                      >
                        <span
                          className={[
                            "grid h-9 w-9 shrink-0 place-items-center rounded-[13px] ring-1 transition-transform duration-200 group-hover:scale-[1.04]",
                            action.iconTone,
                          ].join(" ")}
                        >
                          <Icon size={17} strokeWidth={2.35} />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block whitespace-nowrap text-[13px] font-bold leading-4 tracking-[-0.01em] text-foreground">
                            {action.label}
                          </span>
                          <span className="mt-0.5 block whitespace-nowrap text-[11px] font-medium leading-3 text-muted-foreground">
                            {action.hint}
                          </span>
                        </span>

                        <span
                          className={[
                            "h-1.5 w-1.5 shrink-0 rounded-full opacity-70 transition-all duration-200 group-hover:scale-125 group-hover:opacity-100",
                            action.tone,
                          ].join(" ")}
                        >
                          <span className="block h-full w-full rounded-full bg-current" />
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
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          whileHover={{
            y: -2,
            scale: 1.035,
          }}
          whileTap={{
            scale: 0.94,
          }}
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 22,
          }}
          className={[
            "finance-focus relative grid h-[56px] w-[56px] place-items-center overflow-hidden rounded-[21px] sm:h-[58px] sm:w-[58px]",
            "bg-active text-background ring-1 ring-active/25",
            "shadow-[0_18px_42px_color-mix(in_srgb,var(--active),transparent_68%)]",
            "transition-[filter,box-shadow] duration-200 hover:brightness-105",
            "dark:shadow-[0_18px_42px_color-mix(in_srgb,var(--active),transparent_78%)]",
          ].join(" ")}
        >
          <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_34%_24%,rgba(255,255,255,0.34),transparent_34%)]" />
          <span className="pointer-events-none absolute inset-x-2 top-1 h-5 rounded-full bg-white/12 blur-md" />

          <motion.span
            animate={{
              rotate: open ? 45 : 0,
              scale: open ? 0.96 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 22,
            }}
            className={[
              "relative z-10 grid h-8 w-8 place-items-center rounded-full",
              "bg-white/12 text-background ring-1 ring-white/15 backdrop-blur-sm",
            ].join(" ")}
          >
            <Plus size={25} strokeWidth={2.55} />
          </motion.span>
        </motion.button>
      </div>

      <TransactionModal
        open={transactionOpen}
        defaultType={txType}
        onClose={() => setTransactionOpen(false)}
        onSuccess={() => {
          setTransactionOpen(false);
          refreshAfterSuccess();
        }}
      />

      <TransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSuccess={refreshAfterSuccess}
      />

      <GoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        onSuccess={refreshAfterSuccess}
      />

      <InvestmentModal
        open={investmentOpen}
        onClose={() => setInvestmentOpen(false)}
        onSuccess={refreshAfterSuccess}
      />
    </>
  );
}
