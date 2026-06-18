"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { NAV_ITEMS } from "@/lib/navigation";

interface SidebarProps {
  todayIncome: number;
  todayExpenses: number;
}

export default function Sidebar({ todayIncome, todayExpenses }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const net = todayIncome - todayExpenses;
  const fmt = (n: number) =>
    `PKR ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <aside
      className={`${
        collapsed ? "w-[76px]" : "w-[272px]"
      } flex h-full flex-shrink-0 flex-col border-r border-white/[0.08] bg-[#0b1118]/96 shadow-[18px_0_45px_rgba(0,0,0,0.24)] backdrop-blur-xl transition-[width] duration-300`}
    >
      <div className="flex h-16 flex-shrink-0 items-center justify-between border-b border-white/[0.08] px-4">
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-300/20">
              <BarChart3 size={17} />
            </div>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                Jamal's Finance
              </span>
              <span className="block truncate text-[11px] text-slate-500">
                Personal finance OS
              </span>
            </div>
          </div>
        )}

        {collapsed && (
          <div className="mx-auto grid h-9 w-9 place-items-center rounded-lg bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-300/20">
            <BarChart3 size={17} />
          </div>
        )}

        <button
          onClick={() => setCollapsed((p) => !p)}
          className={`finance-focus flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.055] text-slate-400 transition-colors hover:bg-white/[0.1] hover:text-white ${
            collapsed ? "mx-auto" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
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
              title={collapsed ? label : undefined}
              className={`finance-focus group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all ${
                collapsed ? "justify-center px-2" : ""
              } ${
                active
                  ? "border-cyan-300/20 bg-white/[0.075] text-white shadow-sm shadow-black/20"
                  : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.045] hover:text-white"
              }`}
            >
              <span
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg transition-colors ${
                  active ? tone : "bg-white/[0.045] text-slate-500"
                } group-hover:text-slate-100`}
              >
                <Icon size={16} />
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/[0.08] p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-emerald-400 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30">
              J
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">Jamal</p>
              <p className="truncate text-xs text-slate-500">
                jamal@example.com
              </p>
            </div>
          </div>

          <div className="finance-panel-soft space-y-2.5 p-3">
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <Sparkles size={12} className="text-cyan-300" />
              Today's Summary
            </p>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Income</span>
              <span className="font-medium text-green-400">
                {fmt(todayIncome)}
              </span>
            </div>
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-slate-500">Expenses</span>
              <span className="font-medium text-red-400">
                {fmt(todayExpenses)}
              </span>
            </div>
            <div className="flex justify-between gap-3 border-t border-white/[0.08] pt-2 text-xs">
              <span className="text-slate-500">Net</span>
              <span
                className={`font-medium ${
                  net >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {net >= 0 ? "+" : "-"}
                {fmt(Math.abs(net))}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
