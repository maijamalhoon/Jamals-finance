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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

export interface TransactionFilterOption {
  value: string;
  label: string;
}

const TYPE_OPTIONS: TransactionFilterOption[] = [
  { value: "all", label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "payable", label: "Payable payment" },
  { value: "refund", label: "Expense refund" },
  { value: "investment", label: "Investment contribution" },
  { value: "goal", label: "Goal contribution" },
  { value: "transfer", label: "Transfer" },
];

const SORT_OPTIONS: TransactionFilterOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
];

const FILTER_CONTROL_CLASS =
  "finance-focus h-11 min-h-11 w-full rounded-xl border-0 bg-surface-soft px-3.5 text-sm font-medium text-text-primary shadow-none outline-none transition-colors hover:bg-hover focus:bg-surface-elevated disabled:cursor-not-allowed disabled:opacity-55";

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

  const categoryOptions = useMemo(
    () => [{ value: "all", label: "All categories" }, ...categories],
    [categories],
  );
  const accountOptions = useMemo(
    () => [{ value: "all", label: "All accounts" }, ...accounts],
    [accounts],
  );

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
    <div className="mb-5 min-w-0 space-y-2.5" aria-busy={pending || undefined}>
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
          className="ml-auto grid w-full max-w-[72rem] min-w-0 gap-x-3 gap-y-3 pt-1 sm:grid-cols-2 xl:grid-cols-4"
        >
          <FilterField label="Type" htmlFor="transaction-filter-type">
            <FilterSelect
              id="transaction-filter-type"
              value={activeType}
              options={TYPE_OPTIONS}
              onValueChange={(value) => updateParams({ type: value })}
            />
          </FilterField>

          <FilterField label="From date" htmlFor="transaction-filter-from">
            <input
              id="transaction-filter-from"
              type="date"
              value={activeFrom}
              onChange={(event) => updateParams({ from: event.target.value })}
              className={FILTER_CONTROL_CLASS}
            />
          </FilterField>

          <FilterField label="To date" htmlFor="transaction-filter-to">
            <input
              id="transaction-filter-to"
              type="date"
              value={activeTo}
              onChange={(event) => updateParams({ to: event.target.value })}
              className={FILTER_CONTROL_CLASS}
            />
          </FilterField>

          <FilterField label="Category" htmlFor="transaction-filter-category">
            <FilterSelect
              id="transaction-filter-category"
              value={activeCategory}
              options={categoryOptions}
              onValueChange={(value) => updateParams({ category: value })}
              disabled={categories.length === 0}
            />
          </FilterField>

          <FilterField label="Account" htmlFor="transaction-filter-account">
            <FilterSelect
              id="transaction-filter-account"
              value={activeAccount}
              options={accountOptions}
              onValueChange={(value) => updateParams({ account: value })}
              disabled={accounts.length === 0}
            />
          </FilterField>

          <FilterField label="Sort" htmlFor="transaction-filter-sort">
            <FilterSelect
              id="transaction-filter-sort"
              value={activeSort}
              options={SORT_OPTIONS}
              onValueChange={(value) => updateParams({ sort: value })}
            />
          </FilterField>

          <FilterField label="Source" htmlFor="transaction-filter-source">
            <input
              id="transaction-filter-source"
              value={source}
              onChange={(event) => setSource(event.target.value)}
              placeholder="Ride, salary..."
              className={`${FILTER_CONTROL_CLASS} placeholder:text-text-secondary`}
            />
          </FilterField>

          <FilterField label="Person" htmlFor="transaction-filter-person">
            <input
              id="transaction-filter-person"
              value={person}
              onChange={(event) => setPerson(event.target.value)}
              placeholder="Person name"
              className={`${FILTER_CONTROL_CLASS} placeholder:text-text-secondary`}
            />
          </FilterField>

          <FilterField label="Item" htmlFor="transaction-filter-item">
            <input
              id="transaction-filter-item"
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder="Item name"
              className={`${FILTER_CONTROL_CLASS} placeholder:text-text-secondary`}
            />
          </FilterField>

          <FilterField label="Min amount" htmlFor="transaction-filter-min">
            <input
              id="transaction-filter-min"
              type="number"
              min="0"
              value={activeMin}
              onChange={(event) => updateParams({ min: event.target.value })}
              placeholder="0"
              className={`${FILTER_CONTROL_CLASS} placeholder:text-text-secondary`}
            />
          </FilterField>

          <FilterField label="Max amount" htmlFor="transaction-filter-max">
            <input
              id="transaction-filter-max"
              type="number"
              min="0"
              value={activeMax}
              onChange={(event) => updateParams({ max: event.target.value })}
              placeholder="10000"
              className={`${FILTER_CONTROL_CLASS} placeholder:text-text-secondary`}
            />
          </FilterField>

          {activeControlCount > 0 ? (
            <div className="flex items-end sm:col-span-2 xl:col-span-4 xl:justify-end">
              <button
                onClick={clearFilters}
                className="finance-focus min-h-10 rounded-full bg-transparent px-3.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
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

function FilterSelect({
  id,
  value,
  options,
  onValueChange,
  disabled,
}: {
  id: string;
  value: string;
  options: TransactionFilterOption[];
  onValueChange: (value: string) => void;
  disabled?: boolean;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") onValueChange(nextValue);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={`${FILTER_CONTROL_CLASS} gap-2 pr-3 text-left [&>svg]:ml-auto [&>svg]:text-text-muted`}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selectedOption?.label ?? options[0]?.label ?? ""}
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        sideOffset={6}
        alignItemWithTrigger={false}
        className="z-[90] max-h-[min(18rem,var(--available-height))] max-w-[calc(100vw_-_1.5rem)] rounded-2xl border-0 bg-surface-elevated p-1.5 shadow-premium"
      >
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="min-h-10 rounded-xl py-2.5 pr-9 pl-3 text-sm font-medium"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function FilterField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block px-0.5 text-[11px] font-medium leading-none text-text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
