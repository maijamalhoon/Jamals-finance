"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

export default function TransactionFilters() {
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
  const source = searchParams.get("source") || "";
  const person = searchParams.get("person") || "";
  const item = searchParams.get("item") || "";

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

  return (
    <div className="mb-5">
      <div className="finance-control finance-search-control finance-focus flex min-h-11 w-full max-w-[360px] items-center gap-2 px-3 py-2">
        <Search size={15} className="flex-shrink-0 text-text-secondary" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions..."
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-secondary outline-none"
        />
        {search ? (
          <button
            onClick={() => setSearch("")}
            className="finance-focus grid h-6 w-6 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        ) : null}
        {hasFilters && !search ? (
          <button
            onClick={clearFilters}
            className="finance-focus grid h-6 w-6 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
            aria-label="Clear filters"
          >
            <X size={13} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
