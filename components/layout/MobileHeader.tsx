"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, Menu, X } from "lucide-react";
import {
  isNavItemActive,
  NAV_ITEMS,
  QUICK_ACTION_ITEMS,
} from "@/lib/navigation";
import JamalMenu from "@/components/layout/JamalMenu";
import {
  drawerVariants,
  listContainerVariants,
  listItemVariants,
  overlayVariants,
  panelVariants,
} from "@/components/motion/animation-config";
import { useBodyScrollLock } from "@/components/motion/useBodyScrollLock";

export default function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(open);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const scroller = document.querySelector<HTMLElement>(
      "[data-dashboard-scroll]",
    );
    if (!scroller) return;

    const update = () => setScrolled(scroller.scrollTop > 8);
    update();
    scroller.addEventListener("scroll", update, { passive: true });

    return () => scroller.removeEventListener("scroll", update);
  }, []);

  return (
    <>
      <header
        className={`motion-fade-slide flex h-[66px] flex-shrink-0 items-center justify-between border-b border-border bg-surface px-3 transition-shadow duration-200 lg:hidden ${
          scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-theme"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="finance-focus finance-interactive-tile grid h-10 w-10 min-h-0 place-items-center p-0 text-text-secondary"
            aria-label="Open navigation"
          >
            <Menu size={17} />
          </button>
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[15px] border border-active/30 bg-active text-background shadow-theme">
            <BarChart3 size={16} />
          </div>
          <span className="truncate text-sm font-semibold text-text-primary">
            Finance
          </span>
        </div>

        <div className="relative flex items-center gap-2" ref={bellRef}>
          <button
            type="button"
            onClick={() => setBellOpen((current) => !current)}
            className="finance-focus finance-control relative flex h-10 w-10 items-center justify-center"
            aria-label="Open notifications"
            aria-haspopup="dialog"
            aria-expanded={bellOpen}
          >
            <Bell size={14} className="text-text-secondary" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-active" />
          </button>

          <AnimatePresence>
            {bellOpen && (
              <motion.div
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                role="dialog"
                aria-label="Notifications"
                className="finance-surface absolute right-0 top-12 z-[80] w-[min(82vw,288px)] overflow-hidden"
              >
                <div className="border-b border-border p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    Notifications
                  </p>
                </div>
                <div className="motion-empty p-5 py-8 text-center">
                  <Bell size={23} className="mx-auto mb-2 text-text-secondary" />
                  <p className="text-sm font-semibold text-text-primary">
                    All clear
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    No finance alerts need attention.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <button
              className="absolute inset-0 h-full w-full bg-background/80"
              onClick={() => setOpen(false)}
              aria-label="Close navigation"
            />
            <motion.aside
              className="motion-drawer-surface absolute left-0 top-0 flex h-full w-[min(88vw,380px)] flex-col border-r border-border bg-sidebar p-3 shadow-theme"
              variants={drawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="finance-surface-soft flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                <div className="flex min-h-14 items-center justify-between gap-3 px-2 py-1.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[15px] border border-active/30 bg-active text-background shadow-theme">
                      <BarChart3 size={17} />
                    </div>
                    <p className="truncate text-sm font-bold text-text-primary">
                      Finance
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="finance-focus finance-interactive-tile grid h-9 w-9 min-h-0 place-items-center p-0 text-text-secondary"
                    aria-label="Close navigation"
                  >
                    <X size={17} />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3 pt-2">
                  <motion.nav
                    aria-label="Mobile navigation"
                    className="space-y-1"
                    variants={listContainerVariants}
                    initial="initial"
                    animate="animate"
                  >
                    {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                      const active = isNavItemActive(pathname, href);
                      return (
                        <motion.div key={href} variants={listItemVariants}>
                          <Link
                            href={href}
                            aria-current={active ? "page" : undefined}
                            className={`finance-focus finance-interactive-tile group flex items-center gap-3 overflow-hidden px-3 py-2.5 text-sm ${
                              active
                                ? "border-border bg-hover text-active shadow-[var(--shadow)]"
                                : "text-text-secondary"
                            }`}
                          >
                            {active && (
                              <motion.span
                                layoutId="drawer-active-indicator"
                                className="finance-active-indicator"
                                transition={{
                                  duration: 0.24,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                              />
                            )}
                            <span
                              className={`relative z-10 grid h-8 w-8 place-items-center rounded-[13px] border transition-all duration-200 ${
                                active
                                  ? "border-active/30 bg-card text-active"
                                  : "border-border bg-surface-secondary text-text-secondary group-hover:text-text-primary"
                              }`}
                            >
                              <Icon size={16} strokeWidth={2.15} />
                            </span>
                            <span className="relative z-10 min-w-0 flex-1 truncate font-semibold">
                              {label}
                            </span>
                          </Link>
                        </motion.div>
                      );
                    })}
                  </motion.nav>

                  <motion.div
                    className="mt-5 grid grid-cols-2 gap-2"
                    variants={listContainerVariants}
                    initial="initial"
                    animate="animate"
                    role="group"
                    aria-label="Quick categories"
                  >
                    {QUICK_ACTION_ITEMS.map(({ label, href, icon: Icon, tone }) => (
                      <motion.div key={label} variants={listItemVariants}>
                        <Link
                          href={href}
                          className="finance-focus finance-interactive-tile flex items-center gap-2 border-border bg-surface-secondary px-3 py-2.5 text-sm font-semibold text-text-primary"
                        >
                          <span
                            className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-[13px] ${tone}`}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="truncate">{label}</span>
                        </Link>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                <div className="relative border-t border-border px-1.5 pt-3">
                  <JamalMenu align="left" placement="top" />
                </div>
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
