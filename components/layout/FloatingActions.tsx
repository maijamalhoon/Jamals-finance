"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
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
  const reduceMotion = useReducedMotion();

  const [open, setOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);
  const [investmentOpen, setInvestmentOpen] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);
  const [txType, setTxType] = useState<"income" | "expense">("income");

  const modalOpen = transactionOpen || investmentOpen || externalDialogOpen;
  const shouldAnimateAttention = !open && !modalOpen && !reduceMotion;

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
        className={`jf-floating-actions fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-40 flex flex-col items-start gap-2.5 transition-all duration-200 print:hidden sm:bottom-[calc(5.75rem+env(safe-area-inset-bottom))] sm:left-5 lg:bottom-10 lg:left-8 ${
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
                className="w-[clamp(12.75rem,58vw,15rem)] origin-bottom-left overflow-hidden rounded-[clamp(1.1rem,4vw,1.45rem)] bg-card/96 p-[clamp(0.45rem,2vw,0.7rem)] text-card-foreground shadow-[0_18px_50px_rgb(15_23_42_/_0.16)] backdrop-blur-2xl dark:bg-surface-elevated/96 dark:shadow-[0_22px_56px_rgb(0_0_0_/_0.42)]"
              >
                <div className="grid gap-[clamp(0.15rem,0.8vw,0.3rem)]">
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
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleAction(action.key)}
                        className="finance-focus group flex h-[clamp(2.8rem,12vw,3.25rem)] w-full items-center gap-[clamp(0.6rem,2.8vw,0.85rem)] rounded-[clamp(0.8rem,3vw,1rem)] px-[clamp(0.5rem,2.4vw,0.75rem)] text-left transition-colors duration-150 hover:bg-surface-secondary/90 dark:hover:bg-surface-soft/70"
                      >
                        <span
                          className={`grid size-[clamp(2rem,9vw,2.4rem)] shrink-0 place-items-center rounded-[clamp(0.65rem,2.8vw,0.85rem)] bg-surface-secondary/80 ${action.color} transition-transform duration-150 group-hover:scale-105 dark:bg-surface-soft/65`}
                        >
                          <Icon
                            strokeWidth={2.35}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="size-[clamp(1rem,4.8vw,1.25rem)]"
                          />
                        </span>
                        <span className="text-[clamp(0.78rem,3.4vw,0.9rem)] font-semibold tracking-[-0.01em]">
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

        <motion.div
          animate={
            shouldAnimateAttention
              ? { y: [0, -2, 0], scale: [1, 1.025, 1] }
              : { y: 0, scale: 1 }
          }
          transition={
            shouldAnimateAttention
              ? {
                  duration: 2.6,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatDelay: 1.15,
                }
              : { duration: 0.18 }
          }
          className="relative grid place-items-center"
        >
          <motion.span
            aria-hidden="true"
            animate={
              shouldAnimateAttention
                ? { opacity: [0, 0.24, 0], scale: [0.82, 1.22, 1.34] }
                : { opacity: 0, scale: 0.9 }
            }
            transition={
              shouldAnimateAttention
                ? {
                    duration: 2.1,
                    ease: "easeOut",
                    repeat: Infinity,
                    repeatDelay: 1.65,
                  }
                : { duration: 0.15 }
            }
            className="pointer-events-none absolute inset-0 rounded-full bg-active/35 blur-[1px]"
          />

          <motion.button
            type="button"
            aria-label={open ? "Close quick actions" : "Open quick actions"}
            aria-expanded={open}
            aria-controls="quick-finance-actions"
            data-keep-icon-surface
            onClick={() => setOpen((current) => !current)}
            whileHover={{ y: -1, scale: 1.035 }}
            whileTap={{ scale: 0.92 }}
            animate={{ borderRadius: open ? 18 : 999 }}
            transition={{
              type: "spring",
              stiffness: 390,
              damping: 25,
            }}
            className="finance-focus relative grid size-[clamp(3.15rem,13vw,3.9rem)] place-items-center overflow-hidden bg-card/92 text-foreground shadow-[0_14px_34px_rgb(15_23_42_/_0.18),inset_0_1px_0_rgb(255_255_255_/_0.72)] backdrop-blur-xl transition-[filter,box-shadow,background-color] duration-200 hover:brightness-[1.03] dark:bg-surface-elevated/94 dark:shadow-[0_16px_38px_rgb(0_0_0_/_0.48),inset_0_1px_0_rgb(255_255_255_/_0.08)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-[clamp(0.28rem,1.4vw,0.38rem)] rounded-full bg-active shadow-[0_8px_22px_color-mix(in_srgb,var(--active)_30%,transparent)]"
            />

            <motion.span
              animate={{
                rotate: open ? 45 : 0,
                scale: open ? 0.94 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 430,
                damping: 25,
              }}
              className="relative z-10 grid place-items-center text-primary-foreground"
            >
              <Plus
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-[clamp(1.35rem,5.8vw,1.75rem)]"
              />
            </motion.span>
          </motion.button>
        </motion.div>
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
