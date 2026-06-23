"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell, Menu, X } from "lucide-react";
import { NAV_ITEMS, QUICK_ACTION_ITEMS } from "@/lib/navigation";
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
        className={`flex h-[64px] flex-shrink-0 items-center justify-between border-b border-border bg-surface px-3 transition-shadow duration-200 lg:hidden ${
          scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-theme"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => setOpen(true)}
            className="finance-focus grid h-10 w-10 place-items-center rounded-[14px] border border-border bg-input text-text-secondary hover:bg-hover"
            aria-label="Open navigation"
          >
            <Menu size={17} />
          </button>
          <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[14px] bg-active text-background shadow-theme">
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
            className="finance-focus finance-control relative flex h-9 w-9 items-center justify-center"
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
                className="finance-panel absolute right-0 top-12 z-[80] w-[min(82vw,288px)] overflow-hidden"
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
              className="motion-drawer-surface absolute left-0 top-0 flex h-full w-[min(88vw,380px)] flex-col border-r border-border bg-sidebar shadow-theme"
              variants={drawerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[14px] bg-active text-background shadow-theme">
                  <BarChart3 size={17} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">
                    Finance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="finance-focus grid h-9 w-9 place-items-center rounded-[12px] border border-border bg-input text-text-secondary hover:bg-hover"
                aria-label="Close navigation"
              >
                <X size={17} />
              </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Navigation
              </p>
              <motion.nav
                className="space-y-1.5"
                variants={listContainerVariants}
                initial="initial"
                animate="animate"
              >
                {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                  const active =
                    pathname === href ||
                    (href !== "/dashboard" && pathname.startsWith(href));
                  return (
                    <motion.div key={href} variants={listItemVariants}>
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`finance-focus flex items-center gap-3 rounded-[16px] border px-3 py-3 text-sm transition-all hover:-translate-y-px hover:shadow-[var(--shadow-soft)] active:translate-y-0 active:scale-[0.99] ${
                          active
                            ? "border-border bg-hover text-active"
                            : "border-transparent text-text-secondary hover:border-border hover:bg-hover hover:text-text-primary"
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 place-items-center rounded-2xl ${
                            active
                              ? "bg-card text-active"
                              : "bg-surface-secondary text-text-secondary"
                          }`}
                        >
                          <Icon size={16} />
                        </span>
                        <span>{label}</span>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.nav>

              <p className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
                Quick Categories
              </p>
              <motion.div
                className="grid grid-cols-2 gap-2"
                variants={listContainerVariants}
                initial="initial"
                animate="animate"
              >
                {QUICK_ACTION_ITEMS.map(({ label, href, icon: Icon, tone }) => (
                  <motion.div key={label} variants={listItemVariants}>
                    <Link
                      key={label}
                      href={href}
                      className="finance-focus flex items-center gap-2 rounded-[16px] border border-border bg-surface-secondary px-3 py-3 text-sm text-text-primary transition-all hover:-translate-y-px hover:bg-hover"
                    >
                      <span
                        className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-2xl ${tone}`}
                      >
                        <Icon size={16} />
                      </span>
                      <span className="truncate">{label}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
              </div>

              <div className="relative border-t border-border p-4">
                <JamalMenu align="left" placement="top" />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
