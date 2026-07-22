"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Plus,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const TransactionModal = dynamic(
  () => import("@/components/dashboard/TransactionModal"),
  { ssr: false },
);
const InvestmentModal = dynamic(
  () => import("@/components/investments/InvestmentModal"),
  { ssr: false },
);

type ActionKey = "income" | "expense" | "investment";

const actions = [
  {
    key: "income",
    label: "Add Income",
    ariaLabel: "Add income",
    icon: ArrowUp,
    color: "text-income",
  },
  {
    key: "expense",
    label: "Add Expense",
    ariaLabel: "Add expense",
    icon: ArrowDown,
    color: "text-expense",
  },
  {
    key: "investment",
    label: "Add Investment",
    ariaLabel: "Add investment",
    icon: TrendingUp,
    color: "text-investment",
  },
] satisfies Array<{
  key: ActionKey;
  label: string;
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
      staggerChildren: 0.045,
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
    scale: 0.94,
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
    scale: 0.96,
    transition: {
      duration: 0.1,
      ease: motionEase,
    },
  },
};

export default function FloatingActions() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");

  const modalOpen = transactionOpen || investmentOpen || externalDialogOpen;

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

    setInvestmentOpen(true);
  }

  function refreshAfterSuccess() {
    router.refresh();
  }

  if (!pathname.startsWith("/dashboard")) return null;

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
                className="min-w-[13.5rem] origin-bottom-right overflow-hidden rounded-[22px] bg-card/96 p-2.5 text-card-foreground shadow-[0_18px_50px_rgb(15_23_42_/_0.16)] backdrop-blur-2xl dark:bg-surface-elevated/96 dark:shadow-[0_22px_56px_rgb(0_0_0_/_0.42)]"
              >
                <div className="grid gap-1">
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
                        whileHover={{ x: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleAction(action.key)}
                        className="finance-focus group flex h-12 w-full items-center gap-3 rounded-[15px] px-2.5 text-left transition-colors duration-150 hover:bg-surface-secondary/90 dark:hover:bg-surface-soft/70"
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-[12px] bg-surface-secondary/80 ${action.color} transition-transform duration-150 group-hover:scale-105 dark:bg-surface-soft/65`}
                        >
                          <Icon
                            size={19}
                            strokeWidth={2.4}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="text-sm font-semibold tracking-[-0.01em]">
                          {action.label}
                        </span>
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

      {investmentOpen ? (
        <InvestmentModal
          open
          onClose={() => setInvestmentOpen(false)}
          onSuccess={() => {
            setInvestmentOpen(false);
            refreshAfterSuccess();
          }}
        />
      ) : null}
    </>
  );
}
