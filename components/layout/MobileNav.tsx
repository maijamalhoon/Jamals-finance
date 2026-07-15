"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal } from "lucide-react";

import {
  isNavItemActive,
  MOBILE_MORE_NAV_ITEMS,
  MOBILE_PRIMARY_NAV_ITEMS,
} from "@/lib/navigation";

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE_NAV_ITEMS.some((item) =>
    isNavItemActive(pathname, item.href),
  );

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moreOpen]);

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close more navigation"
              className="fixed inset-0 z-40 cursor-default bg-overlay lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />

            <motion.nav
              aria-label="More dashboard navigation"
              className="fixed bottom-[calc(var(--jf-mobile-nav-height)+var(--jf-mobile-nav-gap)+env(safe-area-inset-bottom))] left-3 right-3 z-[60] max-w-sm overflow-hidden rounded-[22px] border border-border bg-surface-elevated p-2 shadow-[var(--shadow-soft)] lg:hidden"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-2 gap-1.5">
                {MOBILE_MORE_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                  const active = isNavItemActive(pathname, href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      title={label}
                      className={`finance-focus flex min-h-12 min-w-0 items-center gap-2 rounded-[16px] px-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                        active ?
                          "bg-brand text-primary-foreground shadow-[var(--shadow-soft)]"
                        : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                      }`}
                    >
                      <Icon
                        className="h-[17px] w-[17px] shrink-0"
                        aria-hidden="true"
                      />
                      <span className="min-w-0 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Mobile dashboard navigation"
        className="jf-mobile-nav-shell fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 lg:hidden"
      >
        <div className="grid grid-cols-4 gap-1 rounded-[26px] border border-border bg-surface-elevated p-1.5 shadow-[var(--shadow-soft)]">
          {MOBILE_PRIMARY_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                title={label}
                className={`finance-focus relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-1.5 text-[10px] font-bold transition active:scale-[0.98] ${
                  active ?
                    "bg-brand text-primary-foreground shadow-[var(--shadow-soft)]"
                  : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                }`}
              >
                {active ?
                  <span className="absolute inset-x-5 -top-1 h-1 rounded-full bg-primary-foreground/80" />
                : null}
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  aria-hidden="true"
                />
                <span className="max-w-full truncate leading-none">
                  {label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            aria-label={`${moreOpen ? "Close" : "Open"} more dashboard navigation`}
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            onClick={() => setMoreOpen((current) => !current)}
            className={`finance-focus relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-1.5 text-[10px] font-bold transition active:scale-[0.98] ${
              moreActive || moreOpen ?
                "bg-brand text-primary-foreground shadow-[var(--shadow-soft)]"
              : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
            }`}
          >
            {moreActive || moreOpen ?
              <span className="absolute inset-x-5 -top-1 h-1 rounded-full bg-primary-foreground/80" />
            : null}
            <MoreHorizontal
              className="h-[18px] w-[18px] shrink-0"
              aria-hidden="true"
            />
            <span className="max-w-full truncate leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
