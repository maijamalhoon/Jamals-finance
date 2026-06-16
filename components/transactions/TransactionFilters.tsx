"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

const TABS = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

export default function TransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeType = searchParams.get("type") || "all";
  const activeFrom = searchParams.get("from") || "";
  const activeTo = searchParams.get("to") || "";
  const [search, setSearch] = useState(searchParams.get("search") || "");

  function updateParams(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => updateParams({ search }), 350);
    return () => clearTimeout(t);
  }, [search]);

  function clearFilters() {
    setSearch("");
    router.push(pathname);
  }

  const hasFilters = activeType !== "all" || activeFrom || activeTo || search;

  return (
    <div className="space-y-3 mb-5">
      {/* Type Tabs + Search */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParams({ type: tab.value })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeType === tab.value ?
                  "bg-indigo-600 text-white"
                : "text-gray-500 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 w-56">
          <Search size={14} className="text-gray-500 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-full"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X size={13} className="text-gray-500 hover:text-gray-300" />
            </button>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-gray-500 text-xs">From</label>
          <input
            type="date"
            value={activeFrom}
            onChange={(e) => updateParams({ from: e.target.value })}
            className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-gray-500 text-xs">To</label>
          <input
            type="date"
            value={activeTo}
            onChange={(e) => updateParams({ to: e.target.value })}
            className="bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-indigo-500 transition-colors"
            style={{ colorScheme: "dark" }}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
