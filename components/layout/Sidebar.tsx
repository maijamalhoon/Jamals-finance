"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { BarChart3, ChevronRight } from "lucide-react";
import { isNavItemActive, NAV_ITEMS } from "@/lib/navigation";
import JamalMenu from "@/components/layout/JamalMenu";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="motion-fade-slide relative z-50 flex h-full w-[296px] flex-shrink-0 flex-col border-r border-border bg-sidebar p-3 shadow-theme">
      <div className="finance-surface-soft flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <div className="flex min-h-[70px] flex-shrink-0 items-center gap-3 px-2.5 py-2">
          <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-active/30 bg-active text-background shadow-theme">
            <BarChart3 size={19} strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-text-primary">
              Finance
            </p>
          </div>
        </div>

        <nav
          aria-label="Main navigation"
          className="relative min-h-0 flex-1 overflow-y-auto px-1 pb-3 pt-2"
        >
          <div className="space-y-1">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = isNavItemActive(pathname, href);

              return (
                <Link
                  key={href}
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
                      layoutId="sidebar-active-indicator"
                      className="finance-active-indicator"
                      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                  <span
                    className={`relative z-10 grid h-9 w-9 flex-shrink-0 place-items-center rounded-[14px] border transition-all duration-200 ${
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
                  <ChevronRight
                    size={15}
                    className={`relative z-10 transition-all duration-200 ${
                      active
                        ? "translate-x-0 text-active opacity-100"
                        : "-translate-x-1 text-text-tertiary opacity-0 group-hover:translate-x-0 group-hover:opacity-70"
                    }`}
                  />
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="relative border-t border-border px-1.5 pt-3">
          <JamalMenu align="left" placement="top" />
        </div>
      </div>
    </aside>
  );
}
