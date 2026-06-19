"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, ChevronRight, ShieldCheck, Sparkles, Zap } from "lucide-react";
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
        expanded ? "w-[292px]" : "w-[82px]"
      } relative z-50 flex h-full flex-shrink-0 flex-col border-r border-white/[0.10] bg-[#171a21]/92 shadow-[18px_0_60px_rgba(0,0,0,0.30)] backdrop-blur-2xl transition-[width] duration-200 ease-out`}
    >
      <div className="absolute inset-y-6 right-0 w-px bg-gradient-to-b from-transparent via-white/15 to-transparent" />
      <div className="flex h-[72px] flex-shrink-0 items-center justify-between border-b border-white/[0.09] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-[20px] bg-white text-[#111318] shadow-[0_14px_34px_rgba(0,0,0,0.22)]">
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
            <span className="block truncate text-[11px] text-slate-400">
              Fluent One UI workspace
            </span>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-3 py-4">
        <div
          className={`mb-3 overflow-hidden transition-all duration-200 ease-out ${
            expanded ? "h-[86px] opacity-100" : "h-0 opacity-0"
          }`}
        >
          <div className="rounded-[22px] border border-white/[0.09] bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Sparkles size={14} />
              Finance command rail
            </div>
            <p className="mt-2 text-[11px] leading-4 text-slate-500">
              Quick routes, live money context, and fewer wasted clicks.
            </p>
          </div>
        </div>

        {NAV_ITEMS.map(({ label, href, icon: Icon, tone }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              title={expanded ? undefined : label}
              className={`finance-focus group flex items-center gap-3 rounded-[22px] border px-3 py-2.5 text-sm transition-all duration-200 ease-out ${
                expanded ? "" : "justify-center px-2"
              } ${
                active
                  ? "border-white/[0.16] bg-white/[0.11] text-white shadow-[0_12px_30px_rgba(0,0,0,0.22)]"
                  : "border-transparent text-slate-400 hover:border-white/[0.1] hover:bg-white/[0.055] hover:text-white"
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
              {expanded && active && (
                <ChevronRight size={14} className="ml-auto text-white/70" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.08] p-4">
        {expanded ? (
          <div className="space-y-3">
            <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.045] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-sm font-bold text-[#111318] shadow-lg shadow-black/20">
                  J
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Jamal</p>
                  <p className="truncate text-xs text-slate-500">
                    Global finance workspace
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.06] p-2.5">
                <ShieldCheck size={14} className="text-emerald-200" />
                <p className="mt-1 text-[11px] font-semibold text-white">
                  Secure
                </p>
              </div>
              <div className="rounded-2xl border border-amber-300/10 bg-amber-300/[0.06] p-2.5">
                <Zap size={14} className="text-amber-200" />
                <p className="mt-1 text-[11px] font-semibold text-white">
                  Fast
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sm font-bold text-[#111318] shadow-lg shadow-black/20">
            J
          </div>
        )}
      </div>
    </aside>
  );
}
