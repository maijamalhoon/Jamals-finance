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
import DatePicker from "@/components/ui/date-picker";
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
  "!h-12 !min-h-12 w-full rounded-2xl !border-0 bg-surface-soft !px-4 !text-sm font-semibold text-text-primary shadow-none !outline-none !ring-0 transition-[background-color,color] hover:bg-hover focus:bg-surface-inset focus:!outline-none focus:!ring-0 focus-visible:!outline-none focus-visible:!ring-0 disabled:cursor-not-allowed disabled:opacity-50";

const FILTER_DATE_PICKER_CLASS =
  "[&_.field-input]:!h-12 [&_.field-input]:!min-h-12 [&_.field-input]:!rounded-2xl [&_.field-input]:!border-0 [&_.field-input]:!bg-surface-soft [&_.field-input]:!pl-4 [&_.field-input]:!pr-11 [&_.field-input]:!text-sm [&_.field-input]:!font-semibold [&_.field-input]:!text-text-primary [&_.field-input]:!shadow-none [&_.field-input]:!outline-none [&_.field-input]:!ring-0 [&_.field-input:hover]:!bg-hover [&_.field-input:focus]:!bg-surface-inset [&_.field-input:focus]:!outline-none [&_.field-input:focus]:!ring-0 [&_.field-input:focus-visible]:!outline-none [&_.field-input:focus-visible]:!ring-0";

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
  const activeSource = searchParams.get("source") || "";
  const activePerson = searchParams.get("person") || "";
  const activeItem = searchParams.get("item") || "";

  const [search, setSearch] = useState(searchParams.get("search") || "");

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

    if (search === currentSearch) return;

    const timer = window.setTimeout(() => {
      updateParams({ search }, true);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, searchParams, updateParams]);

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const mobileViewport = window.matchMedia("(max-width: 639px)");
    if (!mobileViewport.matches) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function clearFilters() {
    setSearch("");
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
      activeSource,
      activePerson,
      activeItem,
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
    activeSource,
    activePerson,
    activeItem,
  ]);

  const activeControlCount = activeFilterCount + (search ? 1 : 0);

  return (
    <div
      className="relative mb-5 min-w-0 space-y-2.5"
      aria-busy={pending || undefined}
    >
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
        <>
          <button
            type="button"
            aria-label="Close transaction filters"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] border-0 bg-background/60 outline-none backdrop-blur-[2px] animate-in fade-in duration-150 motion-reduce:animate-none sm:hidden"
          />

          <section
            id="transaction-filter-panel"
            role="dialog"
            aria-labelledby="transaction-filter-title"
            className="fixed inset-x-2 bottom-2 z-[80] flex h-[calc(100dvh-1rem)] max-h-[46rem] min-w-0 flex-col overflow-hidden rounded-[1.75rem] !border-0 bg-surface-elevated !shadow-none !outline-none !ring-0 animate-in fade-in zoom-in-95 duration-200 motion-reduce:animate-none sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-[3.25rem] sm:h-auto sm:max-h-[calc(100vh-7rem)] sm:w-[min(44rem,calc(100vw-3rem))] sm:rounded-[1.5rem]"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
              <h3
                id="transaction-filter-title"
                className="text-sm font-semibold text-text-primary sm:text-base"
              >
                Filters
              </h3>
              <button
                type="button"
                aria-label="Close transaction filters"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-0 bg-transparent text-text-secondary shadow-none outline-none ring-0 transition-colors hover:bg-hover hover:text-text-primary focus:outline-none focus-visible:outline-none focus-visible:ring-0"
              >
                <X size={18} strokeWidth={2.1} aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 content-start gap-3 overflow-y-auto overscroll-contain px-4 py-2 sm:max-h-[calc(100vh-15rem)] sm:flex-none sm:grid-cols-2 sm:gap-3.5 sm:px-5">
              <FilterField label="Type" htmlFor="transaction-filter-type">
                <FilterSelect
                  id="transaction-filter-type"
                  value={activeType}
                  options={TYPE_OPTIONS}
                  onValueChange={(value) => updateParams({ type: value })}
                />
              </FilterField>

              {accounts.length > 0 ? (
                <FilterField
                  label="Account"
                  htmlFor="transaction-filter-account"
                >
                  <FilterSelect
                    id="transaction-filter-account"
                    value={activeAccount}
                    options={accountOptions}
                    onValueChange={(value) => updateParams({ account: value })}
                  />
                </FilterField>
              ) : null}

              {categories.length > 0 ? (
                <FilterField
                  label="Category"
                  htmlFor="transaction-filter-category"
                >
                  <FilterSelect
                    id="transaction-filter-category"
                    value={activeCategory}
                    options={categoryOptions}
                    onValueChange={(value) => updateParams({ category: value })}
                  />
                </FilterField>
              ) : null}

              <FilterField label="Sort" htmlFor="transaction-filter-sort">
                <FilterSelect
                  id="transaction-filter-sort"
                  value={activeSort}
                  options={SORT_OPTIONS}
                  onValueChange={(value) => updateParams({ sort: value })}
                />
              </FilterField>

              <FilterField label="From date" htmlFor="transaction-filter-from">
                <DatePicker
                  id="transaction-filter-from"
                  value={activeFrom}
                  onChange={(value) => updateParams({ from: value })}
                  placeholder="DD/MM/YYYY"
                  ariaLabel="From date"
                  scrollPicker={false}
                  className={FILTER_DATE_PICKER_CLASS}
                />
              </FilterField>

              <FilterField label="To date" htmlFor="transaction-filter-to">
                <DatePicker
                  id="transaction-filter-to"
                  value={activeTo}
                  onChange={(value) => updateParams({ to: value })}
                  placeholder="DD/MM/YYYY"
                  ariaLabel="To date"
                  scrollPicker={false}
                  className={FILTER_DATE_PICKER_CLASS}
                />
              </FilterField>
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5">
              {activeControlCount > 0 ? (
                <button
                  onClick={clearFilters}
                  className="min-h-11 rounded-full border-0 bg-transparent px-3.5 py-2 text-sm font-semibold text-text-secondary shadow-none outline-none ring-0 transition-colors hover:bg-hover hover:text-text-primary focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                  type="button"
                >
                  Clear all
                </button>
              ) : (
                <span aria-hidden="true" />
              )}

              <button
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-full border-0 bg-brand/10 px-5 py-2 text-sm font-semibold text-brand shadow-none outline-none ring-0 transition-[background-color,transform] hover:bg-brand/20 active:scale-[0.98] focus:outline-none focus-visible:outline-none focus-visible:ring-0"
                type="button"
              >
                Done
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function FilterSelect({
  id,
  value,
  options,
  onValueChange,
}: {
  id: string;
  value: string;
  options: TransactionFilterOption[];
  onValueChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (typeof nextValue === "string") onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        id={id}
        className={`${FILTER_CONTROL_CLASS} gap-2 !pr-3 text-left [&>svg]:ml-auto [&>svg]:text-text-muted`}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {selectedOption?.label ?? options[0]?.label ?? ""}
        </span>
      </SelectTrigger>
      <SelectContent
        align="start"
        sideOffset={6}
        alignItemWithTrigger={false}
        className="z-[100] max-h-[min(18rem,var(--available-height))] max-w-[calc(100vw_-_1.5rem)] rounded-2xl border-0 bg-surface-elevated p-1.5 shadow-premium"
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
    <div className="min-w-0 space-y-2">
      <label
        htmlFor={htmlFor}
        className="block px-0.5 text-xs font-medium leading-none text-text-muted"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
