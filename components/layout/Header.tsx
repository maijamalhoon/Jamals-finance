"use client";

import { Bell, CalendarDays, Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { panelVariants } from "@/components/motion/animation-config";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [bellOpen, setBellOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

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
    <div
      className={`relative z-40 flex h-[72px] flex-shrink-0 items-center justify-between border-b border-border bg-surface px-6 transition-shadow duration-200 ${
        scrolled ? "shadow-[var(--shadow-soft)]" : "shadow-theme"
      }`}
    >
      <div>
        <h1 className="text-base font-semibold text-text-primary">
          {getGreeting()}
        </h1>
        <p className="text-xs text-text-secondary">Command center is ready</p>
      </div>

      <div className="flex items-center gap-3">
        <form
          onSubmit={handleSearch}
          role="search"
          aria-label="Search transactions"
          className="finance-control finance-focus flex w-72 items-center gap-2 px-3 py-2.5"
        >
          <Search size={13} className="flex-shrink-0 text-text-secondary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            aria-label="Search transactions"
            className="w-full bg-transparent text-xs text-text-primary outline-none placeholder:text-text-secondary"
          />
        </form>

        <time className="finance-control flex items-center gap-2 px-3 py-2 text-xs text-text-secondary">
          <CalendarDays size={13} className="text-text-secondary" />
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </time>

        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen((current) => !current)}
            className="finance-control finance-focus relative flex h-9 w-9 items-center justify-center"
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
                className="finance-panel absolute right-0 top-11 z-[120] w-72 overflow-hidden"
              >
                <div className="border-b border-border p-4">
                  <p className="text-sm font-semibold text-text-primary">
                    Notifications
                  </p>
                </div>
                <div className="motion-empty p-4 py-8 text-center">
                  <Bell size={24} className="mx-auto mb-2 text-text-secondary" />
                  <p className="text-sm text-text-secondary">No new notifications</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    You're all caught up
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
