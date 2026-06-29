"use client";

import { Bell, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { panelVariants } from "@/components/motion/animation-config";
import { isNavItemActive, NAV_ITEMS } from "@/lib/navigation";

function getRouteTitle(pathname: string) {
  const navItem = NAV_ITEMS.find((item) =>
    isNavItemActive(pathname, item.href),
  );
  if (navItem) return navItem.label;
  if (pathname.startsWith("/dashboard/income")) return "Income";
  if (pathname.startsWith("/dashboard/expenses")) return "Expenses";
  if (pathname.startsWith("/dashboard/settings")) return "Settings";
  if (pathname.startsWith("/dashboard/ai-insights")) return "AI Insights";
  return "Dashboard";
}

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const routeTitle = getRouteTitle(pathname);

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

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(query.trim())}`,
    );
    setQuery("");
  }

  return (
    <header
      className={`motion-fade-slide relative z-40 flex h-[76px] flex-shrink-0 items-center justify-between gap-5 border-b border-border bg-surface px-6 transition-shadow duration-200 ${
        scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-theme"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Workspace
        </p>
        <h1 className="mt-1 truncate text-lg font-bold leading-none text-text-primary">
          {routeTitle}
        </h1>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <form
          onSubmit={handleSearch}
          role="search"
          aria-label="Search transactions"
          className="finance-control finance-search-control finance-focus flex h-10 w-72 items-center gap-2 px-3 xl:w-80"
        >
          <Search size={14} className="flex-shrink-0 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
          />
        </form>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((current) => !current)}
            className="finance-control finance-focus relative flex h-10 w-10 items-center justify-center"
            aria-label="Open notifications"
            aria-haspopup="dialog"
            aria-expanded={bellOpen}
          >
            <Bell size={15} className="text-text-secondary" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-card bg-active" />
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
                className="finance-surface absolute right-0 top-12 z-[120] w-72 overflow-hidden"
              >
                <div className="border-b border-border p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    Notifications
                  </p>
                </div>
                <div className="motion-empty p-4 py-8 text-center">
                  <Bell
                    size={24}
                    className="mx-auto mb-2 text-text-secondary"
                  />
                  <p className="text-sm text-text-secondary">
                    No new notifications
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    You're all caught up
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
