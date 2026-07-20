"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { BackgroundRefreshStatus } from "@/components/loading/LoadingPrimitives";

export interface TransactionFilterOption {
  value: string;
  label: string;
}

const REMOVED_FILTER_KEYS = [
  "type",
  "from",
  "to",
  "source",
  "category",
  "account",
  "person",
  "item",
  "min",
  "max",
  "sort",
] as const;

export default function TransactionFilters(_props: {
  categories?: TransactionFilterOption[];
  accounts?: TransactionFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [pending, startNavigation] = useTransition();
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const updateSearchParam = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      REMOVED_FILTER_KEYS.forEach((key) => params.delete(key));
      params.delete("limit");

      if (value.trim()) {
        params.set("search", value);
      } else {
        params.delete("search");
      }

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

  useEffect(() => {
    setSearch(searchParams.get("search") || "");
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const hasRemovedFilter = REMOVED_FILTER_KEYS.some((key) => params.has(key));

    if (!hasRemovedFilter) return;

    REMOVED_FILTER_KEYS.forEach((key) => params.delete(key));
    const nextQuery = params.toString();

    startNavigation(() => {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    });
  }, [pathname, router, searchParams]);

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

  function closeSearch(clearValue = false) {
    if (clearValue) setSearch("");
    setSearchOpen(false);
  }

  return (
    <div className="relative mb-5 min-w-0 space-y-2.5" aria-busy={pending || undefined}>
      <div className="flex min-w-0 items-center justify-end">
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
