"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
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

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => updateParams({ search }), 350);
    return () => clearTimeout(t);
  }, [search, updateParams]);

  function clearFilters() {
    setSearch("");
    router.push(pathname);
  }

  const hasFilters = activeType !== "all" || activeFrom || activeTo || search;

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/[0.08] bg-white/[0.045] p-1 sm:flex">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => updateParams({ type: tab.value })}
              className={`finance-focus rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeType === tab.value
                  ? "bg-cyan-500 text-slate-950"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="finance-control finance-focus flex w-full items-center gap-2 px-3 py-2 lg:w-72">
          <Search size={14} className="flex-shrink-0 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-transparent text-sm text-slate-300 placeholder-slate-600 outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-slate-500 transition-colors hover:text-slate-300"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <label className="w-10 text-xs text-slate-500 sm:w-auto">From</label>
          <input
            type="date"
            value={activeFrom}
            onChange={(e) => updateParams({ from: e.target.value })}
            className="finance-control finance-focus min-h-10 flex-1 px-3 py-2 text-xs text-white outline-none sm:flex-none"
            style={{ colorScheme: "dark" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-10 text-xs text-slate-500 sm:w-auto">To</label>
          <input
            type="date"
            value={activeTo}
            onChange={(e) => updateParams({ to: e.target.value })}
            className="finance-control finance-focus min-h-10 flex-1 px-3 py-2 text-xs text-white outline-none sm:flex-none"
            style={{ colorScheme: "dark" }}
          />
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="finance-focus flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs text-slate-500 transition-colors hover:text-red-400 sm:min-h-0"
          >
            <X size={12} />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
