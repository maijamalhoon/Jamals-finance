"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { BarChart3, ChevronRight } from "lucide-react";

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
          <LayoutGroup id="jamals-finance-sidebar">
            <div className="space-y-1">
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = isNavItemActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`finance-focus group relative flex h-11 items-center gap-3 overflow-hidden rounded-[16px] px-3 text-sm font-semibold transition-colors duration-200 ${
                      active ? "text-active" : (
                        "text-text-secondary hover:bg-hover hover:text-text-primary"
                      )
                    }`}
                  >
                    {active ?
                      <>
                        <motion.span
                          layoutId="sidebar-active-bg"
                          className="absolute inset-0 rounded-[16px] border border-active/15 bg-active/10"
                          transition={sidebarSpring}
                        />

                        <motion.span
                          layoutId="sidebar-active-line"
                          className="absolute left-0 top-1/2 h-7 w-1.5 rounded-r-full bg-active"
                          style={{
                            translateY: "-50%",
                            boxShadow:
                              "0 0 18px color-mix(in srgb, var(--active), transparent 45%)",
                          }}
                          transition={sidebarSpring}
                        />
                      </>
                    : null}

                    <span
                      className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-[13px] border transition-all duration-200 ${
                        active ?
                          "border-active/25 bg-active/12 text-active"
                        : "border-transparent bg-transparent text-text-secondary group-hover:border-border group-hover:bg-surface-secondary group-hover:text-text-primary"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                    </span>

                    <span className="relative z-10 min-w-0 flex-1 truncate">
                      {label}
                    </span>

                    <ChevronRight
                      size={15}
                      className={`relative z-10 shrink-0 transition-all duration-200 ${
                        active ?
                          "translate-x-0 text-active opacity-100"
                        : "-translate-x-1 text-text-tertiary opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </LayoutGroup>
        </nav>

        <div className="relative border-t border-border px-1.5 pt-3">
          <JamalMenu align="left" placement="top" />
        </div>
      </div>
    </aside>
  );
}
