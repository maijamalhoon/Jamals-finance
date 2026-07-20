"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Check, Filter, Search, X } from "lucide-react";

import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";
import { FEATURE_COLOR_CSS } from "@/lib/theme-colors";

export interface TransactionFilterOption {
  value: string;
  label: string;
}

type OpenMenu = "filter" | "sort" | null;
type PeriodValue = "all" | "today" | "week" | "month" | "year";

type TypeOption = {
  value: string;
  label: string;
  color: string;
};

type SortOption = {
  value: "newest" | "oldest" | "highest" | "lowest" | "name";
  label: string;
};

const TYPE_OPTIONS: TypeOption[] = [
  { value: "all", label: "All types", color: FEATURE_COLOR_CSS.muted },
  { value: "income", label: "Income", color: FEATURE_COLOR_CSS.income },
  { value: "expense", label: "Expense", color: FEATURE_COLOR_CSS.expense },
  { value: "transfer", label: "Transfer", color: FEATURE_COLOR_CSS.transfer },
  { value: "goal", label: "Goal", color: FEATURE_COLOR_CSS.goals },
  {
    value: "investment",
    label: "Investment",
    color: FEATURE_COLOR_CSS.investment,
  },
  { value: "payable", label: "Payable", color: FEATURE_COLOR_CSS.payables },
  { value: "refund", label: "Refund", color: "var(--info)" },
];

const PERIOD_OPTIONS: Array<{ value: PeriodValue; label: string }> = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "year", label: "This year" },
];

const SORT_OPTIONS: SortOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "highest", label: "Highest amount" },
  { value: "lowest", label: "Lowest amount" },
  { value: "name", label: "Name (A–Z)" },
];

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: Exclude<PeriodValue, "all">) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "week") {
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
  } else if (period === "month") {
    start.setDate(1);
  } else if (period === "year") {
    start.setMonth(0, 1);
  }

  return {
    from: formatDateValue(start),
    to: formatDateValue(now),
  };
}

function selectedClass(selected: boolean) {
  return selected
    ? "bg-brand/15 text-brand shadow-[inset_2px_0_0_var(--brand)]"
    : "text-text-primary hover:bg-hover";
}

export default function TransactionFilters(_props: {
  categories?: TransactionFilterOption[];
  accounts?: TransactionFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const controlsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pending, startNavigation] = useTransition();
  const [searchOpen, setSearchOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const activeType = searchParams.get("type") || "all";
  const activeSort = searchParams.get("sort") || "newest";
  const periodParam = searchParams.get("period");
  const hasDateRange = Boolean(
    searchParams.get("from") || searchParams.get("to"),
  );
  const activePeriod = PERIOD_OPTIONS.some(
    (option) => option.value === periodParam,
  )
    ? (periodParam as PeriodValue)
    : hasDateRange
      ? "custom"
      : "all";
  const hasActiveFilter = activeType !== "all" || activePeriod !== "all";
  const hasActiveSort = activeSort !== "newest";

  const navigate = useCallback(
    (update: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      update(params);
      params.delete("limit");

      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();
      if (nextQuery === currentQuery) return;

      startNavigation(() => {
        router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams],
  );

  const updateSearchParam = useCallback(
    (value: string) => {
      navigate((params) => {
        if (value.trim()) {
          params.set("search", value.trim());
        } else {
          params.delete("search");
        }
      });
    },
    [navigate],
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
      updateSearchParam(search);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, searchParams, updateSearchParam]);

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !controlsRef.current?.contains(event.target)
      ) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  function closeSearch(clearValue = false) {
    if (clearValue) setSearch("");
    setSearchOpen(false);
  }

  function selectType(value: string) {
    navigate((params) => {
      if (value === "all") params.delete("type");
      else params.set("type", value);
    });
    setOpenMenu(null);
  }

  function selectPeriod(value: PeriodValue) {
    navigate((params) => {
      if (value === "all") {
        params.delete("period");
        params.delete("from");
        params.delete("to");
        return;
      }

      const range = getPeriodRange(value);
      params.set("period", value);
      params.set("from", range.from);
      params.set("to", range.to);
    });
    setOpenMenu(null);
  }

  function selectSort(value: SortOption["value"]) {
    navigate((params) => {
      if (value === "newest") params.delete("sort");
      else params.set("sort", value);
    });
    setOpenMenu(null);
  }

  const filterActive = openMenu === "filter" || hasActiveFilter;
  const sortActive = openMenu === "sort" || hasActiveSort;

  return (
    <div
      ref={controlsRef}
      className="relative mb-5 min-w-0 space-y-2.5"
      aria-busy={pending || undefined}
    >
      <div className="relative flex min-w-0 items-center justify-end gap-2">
        <div
          role="search"
          aria-label="Search transactions"
          className={`finance-focus flex h-11 shrink-0 items-center overflow-hidden rounded-full border transition-[width,background-color,border-color,box-shadow] duration-300 ease-out ${
            searchOpen
              ? "w-[min(26.25rem,calc(100vw-2rem))] border-border bg-surface-inset shadow-none"
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
            onClick={() => {
              setOpenMenu(null);
              setSearchOpen(true);
            }}
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

        <div
          className={`flex shrink-0 items-center gap-2 overflow-visible transition-[width,opacity,transform] duration-200 ${
            searchOpen
              ? "pointer-events-none w-0 -translate-x-1 overflow-hidden opacity-0"
              : "w-auto translate-x-0 opacity-100"
          }`}
          aria-hidden={searchOpen || undefined}
        >
          <div className="relative">
            <button
              type="button"
              aria-label="Filter transactions"
              aria-expanded={openMenu === "filter"}
              aria-controls="transaction-filter-panel"
              tabIndex={searchOpen ? -1 : undefined}
              onClick={() =>
                setOpenMenu((current) =>
                  current === "filter" ? null : "filter",
                )
              }
              className={`finance-focus inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold shadow-sm transition-[background-color,color,box-shadow,transform] duration-200 hover:-translate-y-px active:translate-y-0 ${
                filterActive
                  ? "bg-brand text-white shadow-md"
                  : "bg-surface-inset text-text-primary hover:bg-hover"
              }`}
            >
              <Filter size={17} strokeWidth={2.1} aria-hidden="true" />
              <span>Filter</span>
            </button>

            {openMenu === "filter" ? (
              <div
                id="transaction-filter-panel"
                role="menu"
                aria-label="Filter transactions"
                className="absolute right-[-5.4rem] top-[calc(100%+0.55rem)] z-[80] w-[min(19rem,calc(100vw-1.5rem))] max-h-[min(34rem,calc(100vh-7rem))] overflow-y-auto overscroll-contain rounded-2xl bg-surface py-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:right-0"
              >
                <p className="px-4 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Type
                </p>
                {TYPE_OPTIONS.map((option) => {
                  const selected = activeType === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectType(option.value)}
                      className={`finance-focus relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${selectedClass(
                        selected,
                      )}`}
                    >
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: option.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {selected ? (
                        <Check
                          size={16}
                          strokeWidth={2.2}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}

                <div className="mx-4 my-2 h-px bg-border/60" role="separator" />

                <p className="px-4 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Period
                </p>
                {PERIOD_OPTIONS.map((option) => {
                  const selected = activePeriod === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectPeriod(option.value)}
                      className={`finance-focus relative flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors ${selectedClass(
                        selected,
                      )}`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {selected ? (
                        <Check
                          size={16}
                          strokeWidth={2.2}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <button
              type="button"
              aria-label="Sort transactions"
              aria-expanded={openMenu === "sort"}
              aria-controls="transaction-sort-panel"
              tabIndex={searchOpen ? -1 : undefined}
              onClick={() =>
                setOpenMenu((current) => (current === "sort" ? null : "sort"))
              }
              className={`finance-focus inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-bold shadow-sm transition-[background-color,color,box-shadow,transform] duration-200 hover:-translate-y-px active:translate-y-0 ${
                sortActive
                  ? "bg-brand text-white shadow-md"
                  : "bg-surface-inset text-text-primary hover:bg-hover"
              }`}
            >
              <ArrowUpDown size={17} strokeWidth={2.1} aria-hidden="true" />
              <span>Sort</span>
            </button>

            {openMenu === "sort" ? (
              <div
                id="transaction-sort-panel"
                role="menu"
                aria-label="Sort transactions"
                className="absolute right-0 top-[calc(100%+0.55rem)] z-[80] w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl bg-surface py-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)]"
              >
                <p className="px-4 pb-1 pt-1 text-[10px] font-black uppercase tracking-[0.16em] text-text-muted">
                  Sort by
                </p>
                {SORT_OPTIONS.map((option) => {
                  const selected = activeSort === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      onClick={() => selectSort(option.value)}
                      className={`finance-focus relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium transition-colors ${selectedClass(
                        selected,
                      )}`}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {selected ? (
                        <Check
                          size={16}
                          strokeWidth={2.2}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div aria-live="polite">
        <BackgroundRefreshStatus
          refreshing={pending}
          label="Updating transactions…"
        />
      </div>
    </div>
  );
}
