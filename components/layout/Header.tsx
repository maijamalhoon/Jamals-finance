"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import JamalMenu from "@/components/layout/JamalMenu";
import NotificationCenter from "@/components/layout/NotificationCenter";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getRouteGroup, getRouteTitle } from "@/lib/navigation";
import type { NotificationState } from "@/lib/notifications";

type HeaderProps = {
  notificationState: NotificationState;
};

export default function Header({ notificationState }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const routeTitle = getRouteTitle(pathname);
  const routeGroup = getRouteGroup(pathname);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(trimmedQuery)}`,
    );
    setQuery("");
    setSearchOpen(false);
  }

  return (
    <header className="jf-desktop-header relative z-30 flex min-h-[72px] min-w-0 flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-surface-primary px-4 shadow-theme xl:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-text-tertiary">
          {routeGroup}
        </p>
        <h1 className="mt-1 truncate text-lg font-bold leading-tight text-text-primary xl:text-xl">
          {routeTitle}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <form
          role="search"
          aria-label="Search transactions"
          onSubmit={handleSearch}
          className="finance-control finance-search-control hidden min-h-11 w-64 items-center gap-2 px-3 min-[1440px]:flex min-[1680px]:w-72"
        >
          <Search
            size={16}
            className="shrink-0 text-text-secondary"
            aria-hidden="true"
          />
          <label htmlFor="desktop-transaction-search" className="sr-only">
            Search transactions
          </label>
          <input
            id="desktop-transaction-search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search transactions..."
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
          />
        </form>

        <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
          <SheetTrigger
            type="button"
            aria-label="Open transaction search"
            className="finance-control finance-focus grid h-11 w-11 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:text-text-primary min-[1440px]:hidden"
          >
            <Search size={17} aria-hidden="true" />
          </SheetTrigger>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="h-dvh w-[min(100vw,24rem)] max-w-full gap-0 border-border bg-surface-elevated p-0 sm:w-96 sm:max-w-96"
          >
            <SheetHeader className="border-b border-border px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-lg font-bold text-text-primary">
                    Search transactions
                  </SheetTitle>
                  <SheetDescription className="mt-1 leading-5 text-text-secondary">
                    Find transactions by the terms already supported on the transactions page.
                  </SheetDescription>
                </div>
                <SheetClose
                  className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:bg-hover hover:text-text-primary"
                  aria-label="Close transaction search"
                >
                  <X size={18} aria-hidden="true" />
                </SheetClose>
              </div>
            </SheetHeader>
            <form
              role="search"
              aria-label="Search transactions"
              onSubmit={handleSearch}
              className="p-4"
            >
              <label
                htmlFor="compact-desktop-transaction-search"
                className="mb-2 block text-sm font-semibold text-text-primary"
              >
                Search terms
              </label>
              <div className="finance-control finance-search-control flex min-h-11 items-center gap-2 px-3">
                <Search
                  size={16}
                  className="shrink-0 text-text-secondary"
                  aria-hidden="true"
                />
                <input
                  id="compact-desktop-transaction-search"
                  type="search"
                  autoComplete="off"
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search transactions..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary"
                />
              </div>
              <button
                type="submit"
                className="finance-focus mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-button)] bg-brand px-4 text-sm font-bold text-primary-foreground hover:bg-brand-hover"
              >
                <Search size={16} aria-hidden="true" />
                Search transactions
              </button>
            </form>
          </SheetContent>
        </Sheet>

        <NotificationCenter state={notificationState} />
        <JamalMenu align="right" placement="bottom" variant="avatar" />
      </div>
    </header>
  );
}
