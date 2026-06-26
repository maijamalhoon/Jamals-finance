"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

import { isNavItemActive, NAV_ITEMS } from "@/lib/navigation";
import JamalMenu from "@/components/layout/JamalMenu";

const sidebarSpring = {
  type: "spring" as const,
  stiffness: 520,
  damping: 42,
  mass: 0.75,
};

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="motion-fade-slide relative z-50 flex h-full w-[280px] flex-shrink-0 flex-col border-r border-border bg-card">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-active/10 text-active shadow-sm">
            <BarChart3 size={20} strokeWidth={2.2} />
          </div>

          <div className="min-w-0">
            <p className="text-base font-semibold text-text-primary">Finance</p>
            <p className="truncate text-sm text-text-secondary">Smart money control</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav aria-label="Main navigation" className="space-y-2">
            <LayoutGroup id="jamals-finance-sidebar">
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = isNavItemActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`finance-focus group relative flex items-center gap-3 rounded-[18px] px-4 py-3 text-sm font-medium transition duration-200 ${
                      active
                        ? "text-active"
                        : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="sidebar-active-bg"
                        className="absolute inset-0 rounded-[18px] bg-active/10"
                        transition={sidebarSpring}
                      />
                    )}

                    {active && (
                      <motion.span
                        layoutId="sidebar-active-line"
                        className="absolute left-0 top-1/2 h-9 w-1.5 rounded-r-full bg-active"
                        style={{ translateY: "-50%" }}
                        transition={sidebarSpring}
                      />
                    )}

                    <span
                      className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-[14px] border transition-all duration-200 ${
                        active
                          ? "border-active/25 bg-active/15 text-active"
                          : "border-border/70 bg-surface text-text-secondary group-hover:border-border group-hover:bg-surface-secondary group-hover:text-text-primary"
                      }`}
                    >
                      <Icon size={18} strokeWidth={2.2} />
                    </span>

                    <span className="relative z-10 min-w-0 truncate">{label}</span>
                  </Link>
                );
              })}
            </LayoutGroup>
          </nav>
        </div>

        <div className="border-t border-border/70 px-4 py-4">
          <JamalMenu align="left" placement="top" />
        </div>
      </div>
    </aside>
  );
}
