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

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`${collapsed ? "w-16" : "w-56"} bg-[#0F1117] border-r border-gray-800/50 flex flex-col h-full transition-all duration-300 flex-shrink-0`}
    >
      {/* Logo + Toggle */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800/50 flex-shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <BarChart3 size={20} className="text-indigo-500 flex-shrink-0" />
            <span className="text-white font-semibold text-sm whitespace-nowrap">
              Jamal's Finance
            </span>
          </div>
        )}
        {collapsed && (
          <BarChart3 size={20} className="text-indigo-500 mx-auto" />
        )}
        <button
          onClick={() => setCollapsed((p) => !p)}
          className={`w-6 h-6 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0 ${collapsed ? "mx-auto" : ""}`}
        >
          {collapsed ?
            <ChevronRight size={13} className="text-gray-400" />
          : <ChevronLeft size={13} className="text-gray-400" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                collapsed ? "justify-center" : ""
              } ${
                active ?
                  "bg-indigo-600/20 text-indigo-400 border border-indigo-600/30"
                : "text-gray-500 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info — only when expanded */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-800/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
              J
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">Jamal</p>
              <p className="text-xs text-gray-500 truncate">
                jamal@example.com
              </p>
            </div>
          </div>

          <div className="bg-gray-800/40 rounded-xl p-3 space-y-2">
            <p className="text-xs text-gray-500 font-medium">Today's Summary</p>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Income</span>
              <span className="text-green-400 font-medium">PKR 0</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Expenses</span>
              <span className="text-red-400 font-medium">PKR 0</span>
            </div>
            <div className="flex justify-between text-xs border-t border-gray-700/50 pt-2">
              <span className="text-gray-400">Net</span>
              <span className="text-green-400 font-medium">PKR 0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
