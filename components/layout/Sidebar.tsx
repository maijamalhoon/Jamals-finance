"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";

import JamalMenu from "@/components/layout/JamalMenu";
import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      data-desktop-sidebar
      className="jf-dashboard-sidebar-wrap relative z-40 hidden h-full w-[248px] shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar text-sidebar-foreground lg:flex xl:w-[272px]"
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-4 xl:px-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] border border-brand/25 bg-brand text-primary-foreground shadow-theme">
          <BarChart3 size={18} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-text-primary">
            Jamals Finance
          </p>
          <p className="mt-0.5 truncate text-[11px] font-medium text-text-secondary">
            Personal workspace
          </p>
        </div>
      </div>

      <nav
        aria-label="Desktop dashboard navigation"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3 xl:px-3"
      >
        <div className="space-y-3.5 pb-2">
          {NAV_GROUPS.map((group) => (
            <section key={group.label} aria-labelledby={`nav-${group.label}`}>
              <h2
                id={`nav-${group.label}`}
                className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary"
              >
                {group.label}
              </h2>
              <div className="space-y-1">
                {group.items.map(({ label, href, icon: Icon }) => {
                  const active = isNavItemActive(pathname, href);

                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "true" : "false"}
                      className="jf-sidebar-link finance-focus text-sm font-semibold"
                    >
                      {active ? (
                        <>
                          <span className="jf-sidebar-pill" aria-hidden="true" />
                          <span className="jf-sidebar-line" aria-hidden="true" />
                        </>
                      ) : null}
                      <span className="jf-sidebar-icon">
                        <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                      </span>
                      <span className="relative z-10 min-w-0 flex-1 truncate">
                        {label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="shrink-0 border-t border-border bg-sidebar px-3 py-3">
        <JamalMenu align="left" placement="top" />
      </div>
    </aside>
  );
}
