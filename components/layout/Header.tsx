"use client";

import Link from "next/link";
import {
  Check,
  ChevronDown,
  CircleDollarSign,
  Search,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState, type ReactNode } from "react";

import JamalMenu from "@/components/layout/JamalMenu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DESKTOP_MORE_NAV_GROUPS,
  DESKTOP_PRIMARY_NAV_ITEMS,
  getRouteGroup,
  getRouteTitle,
  isDesktopMoreActive,
  isNavItemActive,
} from "@/lib/navigation";

type HeaderProps = {
  notificationSlot: ReactNode;
};

const desktopNavItemBaseClass =
  "finance-focus relative flex min-h-11 min-w-0 items-center gap-1.5 rounded-[var(--radius-control)] border px-2 text-xs font-bold transition-colors xl:gap-2 xl:px-3 xl:text-sm";
const desktopNavItemActiveClass =
  "border-brand/30 bg-brand/10 text-brand shadow-theme active:bg-brand/15";
const desktopNavItemInactiveClass =
  "border-transparent text-text-secondary hover:border-border hover:bg-hover hover:text-text-primary active:bg-surface-inset active:text-text-primary";

export default function Header({ notificationSlot }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const routeTitle = getRouteTitle(pathname);
  const routeGroup = getRouteGroup(pathname);
  const moreActive = isDesktopMoreActive(pathname);

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
    <header className="jf-desktop-header relative z-30 min-w-0 flex-shrink-0 border-b border-border bg-surface-primary shadow-theme">
      <div className="mx-auto flex min-h-[68px] w-full max-w-[1600px] min-w-0 items-center justify-between gap-3 px-3 xl:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] border border-brand/25 bg-brand text-primary-foreground shadow-theme">
            <CircleDollarSign size={18} aria-hidden="true" />
          </div>

          <div className="min-w-0 shrink-0">
            <p className="truncate text-sm font-bold leading-4 text-text-primary">
              Jamal&apos;s Finance
            </p>
            <p className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
              Personal workspace
            </p>
          </div>

          <span
            aria-hidden="true"
            className="hidden h-8 w-px shrink-0 bg-border xl:block"
          />

          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary">
              {routeGroup}
            </p>
            <h1 className="mt-1 truncate text-base font-bold leading-tight text-text-primary xl:text-lg">
              {routeTitle}
            </h1>
          </div>
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

          {notificationSlot}
          <JamalMenu align="right" placement="bottom" variant="avatar" />
        </div>
      </div>

      <nav
        aria-label="Desktop dashboard navigation"
        className="border-t border-border bg-surface-soft"
      >
        <div className="mx-auto flex min-h-[60px] w-full max-w-[1600px] min-w-0 items-center gap-1 overflow-visible px-3 py-2 xl:gap-1.5 xl:px-5">
          {DESKTOP_PRIMARY_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                className={`${desktopNavItemBaseClass} ${
                  active
                    ? desktopNavItemActiveClass
                    : desktopNavItemInactiveClass
                }`}
              >
                <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                <span className="truncate">{label}</span>
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                  />
                ) : null}
              </Link>
            );
          })}

          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label="Open more dashboard navigation"
              aria-current={moreActive ? "page" : undefined}
              data-active={moreActive ? "true" : "false"}
              className={`${desktopNavItemBaseClass} ${
                moreActive
                  ? desktopNavItemActiveClass
                  : desktopNavItemInactiveClass
              }`}
            >
              <span>More</span>
              <ChevronDown size={14} strokeWidth={2.2} aria-hidden="true" />
              {moreActive ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                />
              ) : null}
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              side="bottom"
              sideOffset={8}
              className="w-72 max-w-[calc(100vw-2rem)] rounded-[var(--radius-tile)] border border-border bg-surface-elevated p-1.5 shadow-[var(--shadow-soft)]"
            >
              {DESKTOP_MORE_NAV_GROUPS.map((group, groupIndex) => (
                <Fragment key={group.label}>
                  {groupIndex > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-text-tertiary">
                      {group.label}
                    </DropdownMenuLabel>
                    {group.items.map(({ label, href, icon: Icon }) => {
                      const active = isNavItemActive(pathname, href);

                      return (
                        <DropdownMenuItem
                          key={href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => router.push(href)}
                          className={`min-h-11 cursor-pointer gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-semibold ${
                            active
                              ? "bg-brand/10 text-brand focus:bg-brand/15 focus:text-brand"
                              : "text-text-secondary focus:bg-hover focus:text-text-primary"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-control)] border ${
                              active
                                ? "border-brand/30 bg-surface-primary"
                                : "border-border bg-surface-soft"
                            }`}
                          >
                            <Icon size={15} strokeWidth={2.2} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                          {active ? (
                            <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                              <Check size={12} strokeWidth={2.4} aria-hidden="true" />
                              Current
                            </span>
                          ) : null}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuGroup>
                </Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </header>
  );
}
