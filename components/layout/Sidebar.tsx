"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="relative z-50 flex h-full w-[286px] flex-shrink-0 flex-col border-r border-slate-200/90 bg-white/92 shadow-[22px_0_70px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(248,250,252,0.82),transparent_34%),linear-gradient(90deg,rgba(219,234,254,0.32),transparent)]" />
      <div className="relative flex h-[82px] flex-shrink-0 items-center gap-3 border-b border-slate-200/80 px-5">
        <div className="grid h-12 w-12 place-items-center rounded-[20px] bg-blue-600 text-white shadow-[0_18px_38px_rgba(37,99,235,0.22)]">
          <BarChart3 size={19} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-slate-950">
            Jamal's Finance
          </p>
          <p className="truncate text-[11px] text-slate-500">
            Personal OS workspace
          </p>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-900">Command Center</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Income, spend, accounts, goals
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-[17px] bg-white text-slate-700 ring-1 ring-slate-200">
              <Gauge size={16} />
            </div>
          </div>
        </div>
      </div>

      <nav className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
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
                className={`finance-focus group flex items-center gap-3 rounded-[22px] border px-3 py-3 text-sm transition-all duration-200 ${
                  active
                    ? "border-blue-100 bg-blue-50 text-blue-700 shadow-[0_14px_34px_rgba(37,99,235,0.10)]"
                    : "border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span
                  className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[17px] transition-colors ${
                    active ? "bg-white text-blue-600 shadow-sm" : "bg-slate-100 text-slate-500"
                  } group-hover:text-slate-950`}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {label}
                </span>
                {active && <ChevronRight size={15} className="text-blue-500" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="relative border-t border-slate-200/80 p-4">
        <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-bold text-white shadow-lg shadow-slate-200">
              J
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-950">Jamal</p>
              <p className="truncate text-[11px] text-slate-500">
                Private finance system
              </p>
            </div>
            <ShieldCheck size={15} className="text-emerald-500" />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[16px] border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-500">
            <CircleDollarSign size={13} />
            Live account tracking enabled
          </div>
        </div>
      </div>
    </aside>
  );
}
