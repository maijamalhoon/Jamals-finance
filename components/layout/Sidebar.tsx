"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation";
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
    <aside
      data-desktop-sidebar
      className="motion-fade-slide relative z-50 hidden h-full w-[280px] flex-shrink-0 flex-col border-r border-border bg-surface-primary lg:flex"
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl border border-brand/25 bg-brand/10 text-brand shadow-sm">
            <BarChart3 size={20} strokeWidth={2.2} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <p className="text-base font-semibold text-text-primary">Finance</p>
            <p className="truncate text-sm text-text-secondary">Smart money control</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav aria-label="Main navigation" className="space-y-4">
            <LayoutGroup id="jamals-finance-sidebar">
              {NAV_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
                    {group.label}
                  </p>

                  {group.items.map(({ label, href, icon: Icon }) => {
                    const active = isNavItemActive(pathname, href);

                    return (
                      <Link
                        key={href}
                        href={href}
                        aria-current={active ? "page" : undefined}
                        title={label}
                        className={`finance-focus group relative flex min-h-11 items-center gap-3 rounded-[16px] px-3 py-2 text-sm font-medium transition duration-200 ${
                          active
                            ? "text-brand"
                            : "text-text-secondary hover:bg-surface-secondary hover:text-text-primary"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active-bg"
                            className="absolute inset-0 rounded-[16px] bg-brand/10"
                            transition={sidebarSpring}
                          />
                        )}

                        <span
                          className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-[13px] border transition-all duration-200 ${
                            active
                              ? "border-brand/30 bg-brand/15 text-brand"
                              : "border-border/70 bg-surface-primary text-text-secondary group-hover:border-border group-hover:bg-surface-secondary group-hover:text-text-primary"
                          }`}
                        >
                          <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
                        </span>

                        <span className="relative z-10 min-w-0 flex-1 truncate">
                          {label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
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
