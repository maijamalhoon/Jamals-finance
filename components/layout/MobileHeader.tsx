"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Bell } from "lucide-react";
import { usePathname } from "next/navigation";
import JamalMenu from "@/components/layout/JamalMenu";
import { panelVariants } from "@/components/motion/animation-config";
import { NAV_ITEMS, isNavItemActive } from "@/lib/navigation";

export default function MobileHeader() {
  const pathname = usePathname();
  const [bellOpen, setBellOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const currentPage =
    NAV_ITEMS.find((item) => isNavItemActive(pathname, item.href))?.label ??
    "Dashboard";

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
        className={`motion-fade-slide flex h-[66px] min-w-0 flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-primary px-3 transition-shadow duration-200 lg:hidden ${
          scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-theme"
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[15px] border border-brand/30 bg-brand text-primary-foreground shadow-theme">
            <BarChart3 size={16} aria-hidden="true" />
          </div>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-4 text-text-primary">
              Finance
            </span>
            <span className="block truncate text-[11px] font-medium leading-4 text-text-secondary">
              {currentPage}
            </span>
          </span>
        </div>

        <div className="relative flex shrink-0 items-center gap-2">
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => setBellOpen((current) => !current)}
              className="finance-focus finance-control relative flex h-11 w-11 items-center justify-center"
              aria-label="Open notifications"
              aria-haspopup="dialog"
              aria-expanded={bellOpen}
            >
              <Bell size={14} className="text-text-secondary" aria-hidden="true" />
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
                  className="finance-surface absolute right-0 top-13 z-[80] w-[min(288px,calc(100vw-1.5rem))] overflow-hidden"
                >
                  <div className="border-b border-border p-4">
                    <p className="text-sm font-semibold text-text-primary">
                      Notifications
                    </p>
                  </div>
                  <div className="motion-empty p-5 py-8 text-center">
                    <Bell size={23} className="mx-auto mb-2 text-text-secondary" aria-hidden="true" />
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

          <JamalMenu align="right" placement="bottom" variant="avatar" />
        </div>
      </header>
    </>
  );
}
