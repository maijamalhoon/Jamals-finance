"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Wallet,
  Target,
  FileText,
  Brain,
  Settings,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    icon: ArrowLeftRight,
  },
  { label: "Income", href: "/dashboard/income", icon: TrendingUp },
  { label: "Expenses", href: "/dashboard/expenses", icon: TrendingDown },
  { label: "Investments", href: "/dashboard/investments", icon: BarChart2 },
  { label: "Accounts", href: "/dashboard/accounts", icon: Wallet },
  { label: "Goals", href: "/dashboard/goals", icon: Target },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "AI Insights", href: "/dashboard/ai-insights", icon: Brain },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

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
    <div
      className={`${
        collapsed ? "w-16" : "w-60"
      } border-r border-white/[0.08] bg-[#0d121f]/95 flex flex-col h-full transition-all duration-300 flex-shrink-0 shadow-[18px_0_45px_rgba(0,0,0,0.22)]`}
    >
      {/* Logo + Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.08] flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
              <BarChart3 size={17} className="flex-shrink-0" />
            </div>
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              Jamal's Finance
            </span>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
            <BarChart3 size={17} />
          </div>
        )}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className={`w-7 h-7 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] flex items-center justify-center transition-colors flex-shrink-0 ${
            collapsed ? "mx-auto" : ""
          }`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ?
            <ChevronRight size={13} className="text-gray-400" />
          : <ChevronLeft size={13} className="text-gray-400" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                collapsed ? "justify-center" : ""
              } ${
                active ?
                  "bg-indigo-500/15 text-indigo-200 border border-indigo-400/25 shadow-sm shadow-indigo-950/30"
                : "border border-transparent text-slate-400 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Icon
                size={16}
                className={`flex-shrink-0 ${
                  active ? "text-indigo-300" : (
                    "text-slate-500 group-hover:text-slate-200"
                  )
                }`}
              />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info — only when expanded */}
      {!collapsed && (
        <div className="p-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-lg shadow-indigo-950/30">
              J
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Jamal</p>
              <p className="text-xs text-gray-500 truncate">
                jamal@example.com
              </p>
            </div>
          </div>

          <div className="finance-panel-soft p-3 space-y-2">
            <p className="text-xs text-slate-400 font-medium">
              Today's Summary
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Income</span>
              <span className="text-green-400 font-medium">
                {fmt(todayIncome)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Expenses</span>
              <span className="text-red-400 font-medium">
                {fmt(todayExpenses)}
              </span>
            </div>
            <div className="flex justify-between text-xs border-t border-white/[0.08] pt-2">
              <span className="text-slate-400">Net</span>
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
    </div>
  );
}
