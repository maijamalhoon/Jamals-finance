"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setExpanded(false);
        }
      }}
      className={`${
        expanded ? "w-[272px]" : "w-[76px]"
      } flex h-full flex-shrink-0 flex-col border-r border-white/[0.08] bg-[#17181c]/95 shadow-[18px_0_45px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-[width] duration-200 ease-out`}
    >
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-300/20">
            <BarChart3 size={17} />
          </div>
          <div
            className={`min-w-0 overflow-hidden transition-all duration-300 ease-in-out ${
              expanded ? "w-44 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <span className="block truncate text-sm font-semibold text-white">
              Jamal's Finance
            </span>
            <span className="block truncate text-[11px] text-slate-500">
              Personal finance OS
            </span>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overflow-x-hidden px-3 py-4">
        {NAV_ITEMS.map(({ label, href, icon: Icon, tone }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              title={expanded ? undefined : label}
              className={`finance-focus group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm transition-all duration-200 ease-out ${
                expanded ? "" : "justify-center px-2"
              } ${
                active
                  ? "border-cyan-300/20 bg-white/[0.075] text-white shadow-sm shadow-black/20"
                  : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-white"
              }`}
            >
              <span
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-2xl transition-colors ${
                  active ? tone : "bg-white/[0.045] text-slate-500"
                } group-hover:text-slate-100`}
              >
                <Icon size={16} />
              </span>
              <span
                className={`truncate transition-all duration-300 ease-in-out ${
                  expanded ? "w-40 opacity-100" : "w-0 opacity-0"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-4">
        {expanded ? (
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30">
              J
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Jamal</p>
              <p className="truncate text-xs text-slate-500">
                jamal@example.com
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-emerald-300 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30">
            J
          </div>
        )}
      </div>
    </aside>
  );
}
