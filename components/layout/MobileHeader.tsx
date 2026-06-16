"use client";

import { BarChart3, Bell } from "lucide-react";

export default function MobileHeader() {
  return (
    <div className="h-14 bg-[#0d121f]/95 border-b border-white/[0.08] flex items-center justify-between px-4 lg:hidden flex-shrink-0 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/20">
          <BarChart3 size={16} />
        </div>
        <span className="text-white font-semibold text-sm">
          Jamal's Finance
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className="finance-control relative w-8 h-8 flex items-center justify-center"
          aria-label="Open notifications"
        >
          <Bell size={14} className="text-slate-300" />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-cyan-400 rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-semibold shadow-lg shadow-indigo-950/25">
          J
        </div>
      </div>
    </div>
  );
}
