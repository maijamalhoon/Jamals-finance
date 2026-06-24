"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import { BarChart3, ChevronRight } from "lucide-react";
import { isNavItemActive, NAV_ITEMS } from "@/lib/navigation";
import JamalMenu from "@/components/layout/JamalMenu";

const sidebarSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 40,
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
          <LayoutGroup id="jf-sidebar-navigation">
            <div className="space-y-1">
              {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
                const active = isNavItemActive(pathname, href);

                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    data-active={active ? "true" : "false"}
                    className="finance-focus jf-sidebar-link group text-sm font-semibold"
                  >
                    {active && (
                      <>
                        <motion.span
                          layoutId="jf-sidebar-pill"
                          className="jf-sidebar-pill"
                          transition={sidebarSpring}
                        />
                        <motion.span
                          layoutId="jf-sidebar-line"
                          className="jf-sidebar-line"
                          transition={sidebarSpring}
                        />
                      </>
                    )}
                    <span className="jf-sidebar-icon">
                      <Icon size={16} strokeWidth={2.2} />
                    </span>
                    <span className="relative z-10 min-w-0 flex-1 truncate">
                      {label}
                    </span>
                    <ChevronRight size={15} className="jf-sidebar-chevron" />
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
