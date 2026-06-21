"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronRight,
  Gauge,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";
import JamalMenu from "@/components/layout/JamalMenu";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-50 flex h-full w-[286px] flex-shrink-0 flex-col border-r border-border bg-sidebar shadow-theme">
      <div className="relative flex h-[82px] flex-shrink-0 items-center gap-3 border-b border-border px-5">
        <div className="grid h-12 w-12 place-items-center rounded-[16px] bg-active text-background shadow-theme">
          <BarChart3 size={19} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-text-primary">
            Finance
          </p>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div className="rounded-[18px] border border-border bg-surface-secondary p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-text-primary">Command Center</p>
              <p className="mt-1 text-[11px] text-text-secondary">
                Income, spend, accounts, goals
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-[17px] bg-card text-text-secondary ring-1 ring-border">
              <Gauge size={16} />
            </div>
          </div>
        </div>
      </div>

      <nav className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
          Workspace
        </p>
        <div className="space-y-1.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`finance-focus group relative flex items-center gap-3 overflow-hidden rounded-[16px] border px-3 py-3 text-sm transition-all duration-200 hover:-translate-y-px hover:shadow-[var(--shadow-soft)] active:translate-y-0 active:scale-[0.99] ${
                  active
                    ? "border-border bg-hover text-active"
                    : "border-transparent text-text-secondary hover:border-border hover:bg-hover hover:text-text-primary"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-active"
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span
                  className={`relative z-10 grid h-9 w-9 flex-shrink-0 place-items-center rounded-[14px] transition-all ${
                    active ? "bg-card text-active" : "bg-surface-secondary text-text-secondary"
                  } group-hover:text-text-primary group-hover:-translate-y-0.5`}
                >
                  <Icon size={16} />
                </span>
                <span className="relative z-10 min-w-0 flex-1 truncate font-medium">
                  {label}
                </span>
                {active && <ChevronRight size={15} className="relative z-10 text-active" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="relative border-t border-border p-4">
        <JamalMenu align="left" placement="top" />
      </div>
    </aside>
  );
}
