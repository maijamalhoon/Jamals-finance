"use client";

import { BarChart3, Bell, Menu } from "lucide-react";

export default function MobileHeader() {
  return (
    <div className="h-14 bg-[#0F1117] border-b border-gray-800/50 flex items-center justify-between px-4 lg:hidden flex-shrink-0">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} className="text-indigo-500" />
        <span className="text-white font-semibold text-sm">
          Jamal's Finance
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button className="relative w-8 h-8 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
          <Bell size={14} className="text-gray-400" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-semibold">
          J
        </div>
      </div>
    </div>
  );
}
