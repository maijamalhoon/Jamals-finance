"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Filter, Search, X } from "lucide-react";

export default function TransactionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);

  const activeType = searchParams.get("type") || "all";
  const activeFrom = searchParams.get("from") || "";
  const activeTo = searchParams.get("to") || "";
  const activeMin = searchParams.get("min") || "";
  const activeMax = searchParams.get("max") || "";

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [person, setPerson] = useState(searchParams.get("person") || "");
  const [item, setItem] = useState(searchParams.get("item") || "");

  const updateParams = useCallback(
    (updates: Record<string, string>, resetLimit = true) => {
      const params = new URLSearchParams(searchParams.toString());

      if (resetLimit) params.delete("limit");

      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === "all") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();

      if (nextQuery === currentQuery) return;

      router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setSource(searchParams.get("source") || "");
    setPerson(searchParams.get("person") || "");
    setItem(searchParams.get("item") || "");
  }, [searchParams]);

  useEffect(() => {
    const currentSearch = searchParams.get("search") || "";
    const currentSource = searchParams.get("source") || "";
    const currentPerson = searchParams.get("person") || "";
    const currentItem = searchParams.get("item") || "";

    if (
      search === currentSearch &&
      source === currentSource &&
      person === currentPerson &&
      item === currentItem
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      updateParams({ search, source, person, item }, true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, source, person, item, searchParams, updateParams]);

  function clearFilters() {
    setSearch("");
    setSource("");
    setPerson("");
    setItem("");
    router.push(pathname, { scroll: false });
  }

  const activeFilterCount = useMemo(() => {
    return [
      activeType !== "all",
      activeFrom,
      activeTo,
      activeMin,
      activeMax,
      search,
      source,
      person,
      item,
    ].filter(Boolean).length;
  }, [
    activeType,
    activeFrom,
    activeTo,
    activeMin,
    activeMax,
    search,
    source,
    person,
    item,
  ]);

  return (
    <div className="mb-5 min-w-0 space-y-3">
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="finance-control finance-search-control finance-focus flex min-h-11 w-full min-w-0 max-w-[420px] items-center gap-2 px-3 py-2">
          <Search size={15} className="flex-shrink-0 text-text-secondary" />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transactions..."
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-text-primary placeholder:text-text-secondary outline-none"
          />

          {search ?
            <button
              onClick={() => setSearch("")}
              className="finance-focus grid h-6 w-6 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
              aria-label="Clear search"
              type="button"
            >
              <X size={13} />
            </button>
          : null}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {activeFilterCount > 0 ?
            <button
              onClick={clearFilters}
              className="finance-focus rounded-full border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
              type="button"
            >
              Clear all
            </button>
          : null}

          <button
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="finance-focus inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:shadow-md"
            type="button"
          >
            <Filter size={15} />
            Filters
            {activeFilterCount > 0 ?
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-active px-1 text-[11px] text-background">
                {activeFilterCount}
              </span>
            : null}
            <ChevronDown
              size={15}
              className={`transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {open ?
        <div className="finance-panel-soft grid min-w-0 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField label="Type">
            <select
              value={activeType}
              onChange={(event) => updateParams({ type: event.target.value })}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="transfer">Transfer</option>
            </select>
          </FilterField>

          <FilterField label="From date">
            <input
              type="date"
              value={activeFrom}
              onChange={(event) => updateParams({ from: event.target.value })}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none"
            />
          </FilterField>

          <FilterField label="To date">
            <input
              type="date"
              value={activeTo}
              onChange={(event) => updateParams({ to: event.target.value })}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none"
            />
          </FilterField>

          <FilterField label="Source">
            <input
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Ride, salary..."
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary placeholder:text-text-secondary outline-none"
            />
          </FilterField>

          <FilterField label="Person">
            <input
              value={person}
              onChange={(event) => setPerson(event.target.value)}
              placeholder="Person name"
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary placeholder:text-text-secondary outline-none"
            />
          </FilterField>

          <FilterField label="Item">
            <input
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder="Item name"
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary placeholder:text-text-secondary outline-none"
            />
          </FilterField>

          <FilterField label="Min amount">
            <input
              type="number"
              min="0"
              value={activeMin}
              onChange={(event) => updateParams({ min: event.target.value })}
              placeholder="0"
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary placeholder:text-text-secondary outline-none"
            />
          </FilterField>

          <FilterField label="Max amount">
            <input
              type="number"
              min="0"
              value={activeMax}
              onChange={(event) => updateParams({ max: event.target.value })}
              placeholder="10000"
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary placeholder:text-text-secondary outline-none"
            />
          </FilterField>
        </div>
      : null}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-text-secondary">{label}</span>
      {children}
    </label>
  );
}
