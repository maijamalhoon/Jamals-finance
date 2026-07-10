"use client";

import Link from "next/link";
import { Bell, Command, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { panelVariants } from "@/components/motion/animation-config";
import JamalMenu from "@/components/layout/JamalMenu";
import {
  DESKTOP_PRIMARY_NAV_ITEMS,
  DESKTOP_SECONDARY_NAV_ITEMS,
  isNavItemActive,
  NAV_ITEMS,
} from "@/lib/navigation";

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
  const [commandQuery, setCommandQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const commandRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const routeTitle = getRouteTitle(pathname);
  const secondaryItems = DESKTOP_SECONDARY_NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(commandQuery.trim().toLowerCase()),
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        commandRef.current &&
        !commandRef.current.contains(e.target as Node)
      ) {
        setCommandOpen(false);
      }

      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCommandOpen(false);
        setBellOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    setCommandOpen(false);
    setCommandQuery("");
    setBellOpen(false);
  }, [pathname]);

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
      className={`motion-fade-slide sticky top-0 z-40 flex h-[76px] flex-shrink-0 items-center justify-between gap-5 border-b border-border bg-surface/92 px-6 backdrop-blur-2xl transition-shadow duration-200 supports-[backdrop-filter]:bg-surface/78 ${
        scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-theme"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-[140px] max-w-[190px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
            Workspace
          </p>
          <h1 className="mt-1 truncate text-lg font-bold leading-none text-text-primary">
            {routeTitle}
          </h1>
        </div>

        <nav
          aria-label="Desktop dashboard navigation"
          className="flex min-w-0 flex-1 items-center gap-1 rounded-[18px] border border-border/70 bg-card/76 p-1 shadow-theme"
        >
          {DESKTOP_PRIMARY_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`finance-focus group relative flex h-10 min-w-0 items-center gap-2 rounded-[14px] px-3 text-sm font-semibold transition duration-200 xl:px-4 ${
                  active
                    ? "bg-active text-background shadow-[0_14px_30px_rgba(59,130,246,0.20)]"
                    : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                }`}
              >
                <Icon className="h-[15px] w-[15px] shrink-0" />
                <span className="hidden truncate xl:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        <div className="relative" ref={commandRef}>
          <button
            type="button"
            onClick={() => setCommandOpen((current) => !current)}
            className="finance-control finance-focus flex h-10 items-center gap-2 px-3 text-sm font-semibold text-text-secondary hover:text-text-primary"
            aria-label="Open page search menu"
            aria-haspopup="dialog"
            aria-expanded={commandOpen}
          >
            <Command size={15} />
            <span>Pages</span>
          </button>

          <AnimatePresence>
            {commandOpen && (
              <motion.div
                variants={panelVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                role="dialog"
                aria-label="Search dashboard pages"
                className="finance-surface absolute right-0 top-12 z-[120] w-[320px] overflow-hidden p-2"
              >
                <div className="finance-control finance-search-control flex h-10 items-center gap-2 px-3">
                  <Search size={14} className="text-text-secondary" />
                  <input
                    type="search"
                    autoComplete="off"
                    value={commandQuery}
                    onChange={(e) => setCommandQuery(e.target.value)}
                    placeholder="Find a page..."
                    aria-label="Find a dashboard page"
                    className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                  />
                </div>

                <div className="mt-2 grid gap-1">
                  {secondaryItems.map(({ label, href, icon: Icon }) => {
                    const active = isNavItemActive(pathname, href);

                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={`finance-focus finance-interactive-tile flex min-h-11 items-center gap-3 px-3 py-2 text-sm font-semibold ${
                          active
                            ? "bg-active/10 text-active"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[12px] border border-border bg-surface">
                          <Icon size={15} />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {label}
                        </span>
                      </Link>
                    );
                  })}

                  {secondaryItems.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-text-secondary">
                      No matching pages
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <form
          onSubmit={handleSearch}
          role="search"
          aria-label="Search transactions"
          className="finance-control finance-search-control finance-focus hidden h-10 w-72 items-center gap-2 px-3 2xl:flex"
        >
          <Search size={14} className="flex-shrink-0 text-text-secondary" />
          <input
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
          />
        </form>

        <div className="relative" ref={bellRef}>
          <button
            type="button"
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

        <JamalMenu align="right" placement="bottom" variant="avatar" />
      </div>
    </header>
  );
}
