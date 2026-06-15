"use client";

import { Bell, Search, ChevronDown } from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  return (
    <div className="h-16 border-b border-gray-800/50 bg-[#0F1117] flex items-center justify-between px-6 flex-shrink-0">
      {/* Greeting */}
      <div>
        <h1 className="text-white font-semibold text-base">
          {getGreeting()}, Jamal 👋
        </h1>
        <p className="text-gray-500 text-xs">Here's your financial overview</p>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 w-48">
          <Search size={13} className="text-gray-500 flex-shrink-0" />
          <input
            placeholder="Search anything..."
            className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
          />
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-gray-300 cursor-pointer">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          <ChevronDown size={12} className="text-gray-500" />
        </div>

        {/* Notification Bell */}
        <button className="relative w-9 h-9 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center">
          <Bell size={15} className="text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border border-[#0F1117]" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold cursor-pointer">
          J
        </div>
      </div>
    </div>
  );
}
