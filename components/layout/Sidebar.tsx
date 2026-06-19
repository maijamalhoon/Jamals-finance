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
    <aside className="relative z-50 flex h-full w-[286px] flex-shrink-0 flex-col border-r border-white/[0.10] bg-[#11151d]/88 shadow-[24px_0_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),transparent_30%),linear-gradient(90deg,rgba(255,255,255,0.04),transparent)]" />
      <div className="relative flex h-[82px] flex-shrink-0 items-center gap-3 border-b border-white/[0.09] px-5">
        <div className="grid h-12 w-12 place-items-center rounded-[22px] bg-white text-[#101318] shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
          <BarChart3 size={19} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-white">
            Jamal's Finance
          </p>
          <p className="truncate text-[11px] text-slate-500">
            Windows 11 x One UI workspace
          </p>
        </div>
      </div>

      <div className="relative px-4 py-4">
        <div className="rounded-[26px] border border-white/[0.10] bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white">Command Center</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Income, spend, accounts, goals
              </p>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-[18px] bg-white/[0.08] text-white ring-1 ring-white/[0.10]">
              <Gauge size={16} />
            </div>
          </div>
        </div>
      </div>

      <nav className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Workspace
        </p>
        <div className="space-y-1.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon, tone }) => {
            const active =
              pathname === href ||
              (href !== "/dashboard" && pathname.startsWith(href));

            return (
              <Link
                key={href}
                href={href}
                className={`finance-focus group flex items-center gap-3 rounded-[22px] border px-3 py-3 text-sm transition-all duration-200 ${
                  active
                    ? "border-white/[0.16] bg-white/[0.12] text-white shadow-[0_14px_34px_rgba(0,0,0,0.24)]"
                    : "border-transparent text-slate-400 hover:border-white/[0.10] hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <span
                  className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-[17px] transition-colors ${
                    active ? tone : "bg-white/[0.045] text-slate-500"
                  } group-hover:text-white`}
                >
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {label}
                </span>
                {active && <ChevronRight size={15} className="text-white/70" />}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="relative border-t border-white/[0.08] p-4">
        <div className="rounded-[26px] border border-white/[0.09] bg-white/[0.055] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[20px] bg-white text-sm font-bold text-[#111318] shadow-lg shadow-black/20">
              J
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">Jamal</p>
              <p className="truncate text-[11px] text-slate-500">
                Private finance system
              </p>
            </div>
            <ShieldCheck size={15} className="text-emerald-300" />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-white/[0.07] bg-black/10 px-3 py-2 text-[11px] text-slate-400">
            <CircleDollarSign size={13} />
            Live account tracking enabled
          </div>
        </div>
      </div>
    </aside>
  );
}
