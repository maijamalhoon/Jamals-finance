"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Filter, Search, X } from "lucide-react";
import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";

export interface TransactionFilterOption {
  value: string;
  label: string;
}

export default function TransactionFilters({
  categories = [],
  accounts = [],
}: {
  categories?: TransactionFilterOption[];
  accounts?: TransactionFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pending, startNavigation] = useTransition();

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeType = searchParams.get("type") || "all";
  const activeFrom = searchParams.get("from") || "";
  const activeTo = searchParams.get("to") || "";
  const activeMin = searchParams.get("min") || "";
  const activeMax = searchParams.get("max") || "";
  const activeCategory = searchParams.get("category") || "all";
  const activeAccount = searchParams.get("account") || "all";
  const activeSort = searchParams.get("sort") || "newest";

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [person, setPerson] = useState(searchParams.get("person") || "");
  const [item, setItem] = useState(searchParams.get("item") || "");

  const updateParams = useCallback(
    (updates: Record<string, string>, resetLimit = true) => {
      const params = new URLSearchParams(searchParams.toString());

      if (resetLimit) {
        params.delete("limit");
      }

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

      startNavigation(() => {
        router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams, startNavigation],
  );

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
    setSource(searchParams.get("source") || "");
    setPerson(searchParams.get("person") || "");
    setItem(searchParams.get("item") || "");
  }, [searchParams]);

  useEffect(() => {
    if (!searchOpen) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

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
    startNavigation(() => router.push(pathname, { scroll: false }));
  }

  function closeSearch(clearValue = false) {
    if (clearValue) setSearch("");
    setSearchOpen(false);
  }

  const activeFilterCount = useMemo(() => {
    return [
      activeType !== "all",
      activeFrom,
      activeTo,
      activeMin,
      activeMax,
      activeCategory !== "all",
      activeAccount !== "all",
      activeSort !== "newest",
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
    activeCategory,
    activeAccount,
    activeSort,
    source,
    person,
    item,
  ]);

  const activeControlCount = activeFilterCount + (search ? 1 : 0);

  return (
    <div className="mb-5 min-w-0 space-y-3" aria-busy={pending || undefined}>
      <div className="flex min-w-0 items-center justify-end gap-2">
        <div
          role="search"
          aria-label="Search transactions"
          className={`finance-focus flex h-11 shrink-0 items-center overflow-hidden rounded-full border transition-[width,background-color,border-color,box-shadow] duration-300 ease-out ${
            searchOpen
              ? "w-[min(26.25rem,calc(100vw-5.5rem))] border-border bg-surface-inset shadow-none"
              : search
                ? "w-11 border-transparent bg-brand/10"
                : "w-11 border-transparent bg-transparent hover:bg-hover"
          }`}
        >
          <button
            type="button"
            aria-label={
              searchOpen ? "Search transactions" : "Open transaction search"
            }
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen(true)}
            className={`finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors hover:text-text-primary ${
              search ? "text-brand" : "text-text-secondary"
            }`}
          >
            <Search size={20} strokeWidth={2.1} aria-hidden="true" />
          </button>

          <label htmlFor="transaction-page-search" className="sr-only">
            Search transactions
          </label>
          <input
            ref={searchInputRef}
            id="transaction-page-search"
            type="search"
            autoComplete="off"
            tabIndex={searchOpen ? 0 : -1}
            aria-hidden={!searchOpen}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
              }
            }}
            placeholder="Search transactions..."
            className={`min-w-0 bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-secondary transition-[width,opacity] duration-200 ${
              searchOpen
                ? "mr-1 w-full flex-1 opacity-100"
                : "pointer-events-none w-0 opacity-0"
            }`}
          />

          <button
            type="button"
            aria-label={search ? "Clear and close search" : "Close search"}
            tabIndex={searchOpen ? 0 : -1}
            onClick={() => closeSearch(Boolean(search))}
            className={`finance-focus mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition-[opacity,transform,background-color,color] duration-200 hover:bg-hover hover:text-text-primary ${
              searchOpen
                ? "scale-100 opacity-100"
                : "pointer-events-none scale-90 opacity-0"
            }`}
          >
            <X size={16} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </div>

        <button
          onClick={() => setOpen((value) => !value)}
          aria-label={
            open ? "Close transaction filters" : "Open transaction filters"
          }
          aria-expanded={open}
          aria-controls="transaction-filter-panel"
          className={`finance-focus relative grid h-11 w-11 shrink-0 place-items-center rounded-full border border-transparent bg-transparent transition-colors hover:bg-hover hover:text-text-primary ${
            open || activeFilterCount > 0 ? "text-brand" : "text-text-secondary"
          }`}
          type="button"
        >
          <Filter size={20} strokeWidth={2.1} aria-hidden="true" />
          {activeFilterCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-active px-1 text-[10px] font-bold leading-none text-background">
              {activeFilterCount}
            </span>
          ) : null}
        </button>
      </div>

      <div aria-live="polite">
        <BackgroundRefreshStatus
          refreshing={pending}
          label="Updating transactions…"
        />
      </div>

      {open ? (
        <div
          id="transaction-filter-panel"
          className="finance-panel-soft grid min-w-0 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <FilterField label="Type">
            <select
              value={activeType}
              onChange={(event) => updateParams({ type: event.target.value })}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none"
            >
              <option value="all">All</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="payable">Payable payment</option>
              <option value="refund">Expense refund</option>
              <option value="investment">Investment contribution</option>
              <option value="goal">Goal contribution</option>
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

          <FilterField label="Category">
            <select
              value={activeCategory}
              onChange={(event) =>
                updateParams({ category: event.target.value })
              }
              disabled={categories.length === 0}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">All categories</option>
              {categories.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Account">
            <select
              value={activeAccount}
              onChange={(event) =>
                updateParams({ account: event.target.value })
              }
              disabled={accounts.length === 0}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="all">All accounts</option>
              {accounts.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Sort">
            <select
              value={activeSort}
              onChange={(event) => updateParams({ sort: event.target.value })}
              className="finance-control finance-focus h-10 w-full px-3 text-sm text-text-primary outline-none"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="highest">Highest amount</option>
              <option value="lowest">Lowest amount</option>
            </select>
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

          {activeControlCount > 0 ? (
            <div className="flex items-end sm:col-span-2 lg:col-span-4 lg:justify-end">
              <button
                onClick={clearFilters}
                className="finance-focus min-h-10 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                type="button"
              >
                Clear all
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
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
