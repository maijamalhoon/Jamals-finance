"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Search } from "lucide-react";

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
  const [search, setSearch] = useState(searchParams.get("search") || "");

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounce search so it doesn't fire on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams("search", search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="flex items-center justify-between mb-5 gap-4">
      {/* Type Tabs */}
      <div className="flex gap-1 p-1 bg-gray-800/50 rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams("type", tab.value)}
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

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-800/60 border border-gray-700/50 rounded-xl px-3 py-2.5 w-60">
        <Search size={14} className="text-gray-500 flex-shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="bg-transparent text-sm text-gray-300 placeholder-gray-600 outline-none w-full"
        />
      </div>
    </div>
  );
}
