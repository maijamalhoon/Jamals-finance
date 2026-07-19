"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  HandCoins,
  Landmark,
  Plus,
  Target,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const TransferModal = dynamic(() => import("@/components/accounts/TransferModal"), {
  ssr: false,
});
const AccountModal = dynamic(() => import("@/components/accounts/AccountModal"), {
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
const PayableModal = dynamic(() => import("@/components/payables/PayableModal"), {
  ssr: false,
});

type ActionKey =
  | "income"
  | "expense"
  | "investment"
  | "transfer"
  | "goal"
  | "payable"
  | "account";

const actions = [
  {
    key: "income",
    ariaLabel: "Add income",
    icon: ArrowUp,
    color: "text-income",
  },
  {
    key: "expense",
    ariaLabel: "Add expense",
    icon: ArrowDown,
    color: "text-expense",
  },
  {
    key: "investment",
    ariaLabel: "Add investment",
    icon: TrendingUp,
    color: "text-investment",
  },
  {
    key: "transfer",
    ariaLabel: "Transfer money",
    icon: ArrowLeftRight,
    color: "text-transfer",
  },
  {
    key: "goal",
    ariaLabel: "Add goal",
    icon: Target,
    color: "text-goals",
  },
  {
    key: "payable",
    ariaLabel: "Add payable",
    icon: HandCoins,
    color: "text-payables",
  },
  {
    key: "account",
    ariaLabel: "Add account",
    icon: Landmark,
    color: "text-active",
  },
] satisfies Array<{
  key: ActionKey;
  ariaLabel: string;
  icon: LucideIcon;
  color: string;
}>;

const motionEase = [0.16, 1, 0.3, 1] as const;

const menuVariants: Variants = {
  initial: {
    opacity: 0,
    y: 12,
    scale: 0.955,
    filter: "blur(7px)",
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: {
      duration: 0.22,
      ease: motionEase,
      staggerChildren: 0.035,
      delayChildren: 0.025,
    },
  },
  exit: {
    opacity: 0,
    y: 9,
    scale: 0.97,
    filter: "blur(4px)",
    transition: {
      duration: 0.15,
      ease: motionEase,
    },
  },
};

const itemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 7,
    scale: 0.86,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 470,
      damping: 29,
    },
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.92,
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
  const [payableOpen, setPayableOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");
  const modalOpen =
    transactionOpen ||
    transferOpen ||
    goalOpen ||
    investmentOpen ||
    payableOpen ||
    accountOpen ||
    externalDialogOpen;

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
    setPayableOpen(false);
    setAccountOpen(false);
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

    if (key === "goal") {
      setGoalOpen(true);
      return;
    }

    if (key === "payable") {
      setPayableOpen(true);
      return;
    }

    setAccountOpen(true);
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
          {open && !modalOpen ? (
            <>
              <motion.button
                type="button"
                aria-label="Close quick actions"
                onClick={() => setOpen(false)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 -z-10 cursor-default bg-background/20 backdrop-blur-[3px] lg:bg-transparent lg:backdrop-blur-0"
              />

              <motion.div
                id="quick-finance-actions"
                role="menu"
                aria-label="Quick finance actions"
                variants={menuVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="origin-bottom-right overflow-hidden rounded-[22px] border border-border/60 bg-card/94 p-2.5 text-card-foreground shadow-[0_18px_50px_rgb(15_23_42_/_0.16)] backdrop-blur-2xl dark:border-border-strong/55 dark:bg-surface-elevated/94 dark:shadow-[0_22px_56px_rgb(0_0_0_/_0.42)]"
              >
                <div className="grid grid-cols-4 gap-1.5">
                  {actions.map((action) => {
                    const Icon = action.icon;

                    return (
                      <motion.button
                        key={action.key}
                        type="button"
                        role="menuitem"
                        aria-label={action.ariaLabel}
                        data-keep-icon-surface
                        variants={itemVariants}
                        whileHover={{ y: -2, scale: 1.055 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAction(action.key)}
                        className={`finance-focus group relative grid size-11 place-items-center rounded-[14px] bg-transparent ${action.color} transition-[background-color,filter] duration-150 hover:bg-surface-secondary/90 hover:drop-shadow-[0_5px_8px_rgb(15_23_42_/_0.12)] dark:hover:bg-surface-soft/70`}
                      >
                        <Icon
                          size={20}
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                          className="transition-transform duration-150 group-hover:scale-105"
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>

        <motion.button
          type="button"
          aria-label={open ? "Close quick actions" : "Open quick actions"}
          aria-expanded={open}
          aria-controls="quick-finance-actions"
          data-keep-icon-surface
          onClick={() => setOpen((current) => !current)}
          whileHover={{ y: -1, scale: 1.025 }}
          whileTap={{ scale: 0.92 }}
          animate={{ borderRadius: open ? 18 : 20 }}
          transition={{
            type: "spring",
            stiffness: 390,
            damping: 25,
          }}
          className="finance-focus relative grid h-[54px] w-[54px] place-items-center bg-active text-primary-foreground shadow-[0_14px_30px_color-mix(in_srgb,var(--active)_28%,transparent)] transition-[filter,box-shadow] duration-200 hover:brightness-[1.04] sm:h-[56px] sm:w-[56px]"
        >
          <motion.span
            animate={{
              rotate: open ? 45 : 0,
              scale: open ? 0.96 : 1,
            }}
            transition={{
              type: "spring",
              stiffness: 430,
              damping: 25,
            }}
            className="relative z-10 grid place-items-center"
          >
            <Plus
              size={25}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            />
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

      {payableOpen ? (
        <PayableModal open onClose={() => setPayableOpen(false)} />
      ) : null}

      {accountOpen ? (
        <AccountModal
          open
          onClose={() => setAccountOpen(false)}
          onSuccess={() => {
            setAccountOpen(false);
            refreshAfterSuccess();
          }}
        />
      ) : null}
    </>
  );
}
