"use client";

import { Bell, ChevronDown, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(query.trim())}`,
    );
    setQuery("");
  }

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
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 w-52"
        >
          <Search size={13} className="text-gray-500 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions…"
            className="bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none w-full"
          />
        </form>

        {/* Date */}
        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-xs text-gray-300">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          <ChevronDown size={12} className="text-gray-500" />
        </div>

        {/* Bell */}
        <button className="relative w-9 h-9 rounded-xl bg-gray-800/60 border border-gray-700/50 flex items-center justify-center hover:bg-gray-700/60 transition-colors">
          <Bell size={15} className="text-gray-400" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-[#0F1117]" />
        </button>

        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-semibold cursor-pointer hover:bg-indigo-700 transition-colors">
          J
        </div>
      </div>
    </div>
  );
}
