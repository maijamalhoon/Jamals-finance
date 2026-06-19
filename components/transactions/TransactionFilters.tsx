"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";
import DatePicker from "@/components/ui/date-picker";

const TABS = [
  { label: "All", value: "all" },
  { label: "Income", value: "income" },
  { label: "Expense", value: "expense" },
];

interface FilterCategory {
  id: string;
  name: string;
  type: string;
  parent?: { name: string } | null;
}

interface FilterAccount {
  id: string;
  name: string;
}

export default function TransactionFilters({
  categories = [],
  accounts = [],
}: {
  categories?: FilterCategory[];
  accounts?: FilterAccount[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeType = searchParams.get("type") || "all";
  const activeFrom = searchParams.get("from") || "";
  const activeTo = searchParams.get("to") || "";
  const activeCategory = searchParams.get("category") || "all";
  const activeAccount = searchParams.get("account") || "all";
  const activeMin = searchParams.get("min") || "";
  const activeMax = searchParams.get("max") || "";
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [person, setPerson] = useState(searchParams.get("person") || "");
  const [item, setItem] = useState(searchParams.get("item") || "");

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
    setSource("");
    setPerson("");
    setItem("");
    router.push(pathname);
  }

  const hasFilters =
    activeType !== "all" ||
    activeFrom ||
    activeTo ||
    activeCategory !== "all" ||
    activeAccount !== "all" ||
    activeMin ||
    activeMax ||
    search ||
    source ||
    person ||
    item;

  useEffect(() => {
    const t = setTimeout(() => updateParams({ source, person, item }), 350);
    return () => clearTimeout(t);
  }, [source, person, item, updateParams]);

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
                  ? "bg-white text-[#111318] shadow-[0_8px_22px_rgba(0,0,0,0.18)]"
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
          <DatePicker
            value={activeFrom}
            onChange={(value) => updateParams({ from: value })}
            placeholder="Start date"
            className="min-w-[160px] flex-1 sm:flex-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="w-10 text-xs text-slate-500 sm:w-auto">To</label>
          <DatePicker
            value={activeTo}
            onChange={(value) => updateParams({ to: value })}
            placeholder="End date"
            className="min-w-[160px] flex-1 sm:flex-none"
          />
        </div>

        <select
          value={activeCategory}
          onChange={(e) => updateParams({ category: e.target.value })}
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none"
          style={{ colorScheme: "dark" }}
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.parent?.name ?
                `${category.parent.name} / ${category.name}`
              : `${category.name} (${category.type})`}
            </option>
          ))}
        </select>

        <select
          value={activeAccount}
          onChange={(e) => updateParams({ account: e.target.value })}
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none"
          style={{ colorScheme: "dark" }}
          aria-label="Filter by account"
        >
          <option value="all">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={activeMin}
          onChange={(e) => updateParams({ min: e.target.value })}
          placeholder="Min amount"
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none placeholder-slate-600"
        />
        <input
          type="number"
          value={activeMax}
          onChange={(e) => updateParams({ max: e.target.value })}
          placeholder="Max amount"
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none placeholder-slate-600"
        />

        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Income source"
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none placeholder-slate-600"
        />
        <input
          value={person}
          onChange={(e) => setPerson(e.target.value)}
          placeholder="Person name"
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none placeholder-slate-600"
        />
        <input
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Item name"
          className="finance-control finance-focus min-h-10 px-3 py-2 text-xs text-white outline-none placeholder-slate-600"
        />

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
