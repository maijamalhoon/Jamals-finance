"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import JamalMenu from "@/components/layout/JamalMenu";
import { NAV_ITEMS, isNavItemActive, type NavItem } from "@/lib/navigation";

type HeaderProps = {
  notificationSlot: ReactNode;
};

const DESKTOP_HEADER_HREFS = [
  "/dashboard",
  "/dashboard/transactions",
  "/dashboard/accounts",
  "/dashboard/analytics",
  "/dashboard/income",
  "/dashboard/expenses",
  "/dashboard/investments",
  "/dashboard/goals",
  "/dashboard/payables",
  "/dashboard/ai-insights",
] as const;

const DESKTOP_HEADER_NAV_ITEMS = DESKTOP_HEADER_HREFS.map((href) =>
  NAV_ITEMS.find((item) => item.href === href),
).filter((item): item is NavItem => Boolean(item));

const desktopNavItemBaseClass =
  "finance-focus relative grid h-10 w-full max-w-11 min-w-0 place-items-center justify-self-center rounded-[14px] border transition-[background-color,border-color,color,transform] duration-150 min-[1180px]:h-11 min-[1180px]:max-w-12 2xl:h-12 2xl:max-w-14";
const desktopNavItemActiveClass =
  "border-transparent bg-brand/10 text-brand shadow-none active:bg-brand/15";
const desktopNavItemInactiveClass =
  "border-transparent text-text-secondary hover:bg-hover hover:text-text-primary active:scale-[0.985] active:bg-surface-inset";

export default function Header({ notificationSlot }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!searchOpen) return;

    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [searchOpen]);

  function closeSearch() {
    setSearchOpen(false);
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      searchInputRef.current?.focus();
      return;
    }

    router.push(
      `/dashboard/transactions?search=${encodeURIComponent(trimmedQuery)}`,
    );
    setQuery("");
    closeSearch();
  }

  return (
    <header className="jf-desktop-header relative z-30 min-w-0 flex-shrink-0 bg-background px-1.5 py-1.5">
      <style jsx global>{`
        @media (min-width: 1024px) {
          .jf-desktop-header-tools [data-header-search-trigger],
          .jf-desktop-header-tools [data-notification-trigger],
          .jf-desktop-header-tools [data-profile-trigger] {
            transform: translateY(0) scale(1);
            transition:
              background-color 150ms cubic-bezier(0.4, 0, 0.2, 1),
              color 150ms cubic-bezier(0.4, 0, 0.2, 1),
              transform 150ms cubic-bezier(0.4, 0, 0.2, 1) !important;
          }

          @media (hover: hover) and (pointer: fine) {
            .jf-desktop-header-tools [data-header-search-trigger]:hover,
            .jf-desktop-header-tools [data-notification-trigger]:hover,
            .jf-desktop-header-tools [data-profile-trigger]:hover {
              background-color: var(--hover) !important;
              color: var(--text-primary) !important;
              transform: translateY(0) scale(1) !important;
            }
          }

          .jf-desktop-header-tools [data-header-search-trigger]:active,
          .jf-desktop-header-tools [data-notification-trigger]:active,
          .jf-desktop-header-tools [data-profile-trigger]:active {
            background-color: var(--surface-inset) !important;
            transform: translateY(0) scale(0.985) !important;
          }
        }
      `}</style>

      <div className="mx-auto flex min-h-[4.75rem] w-full max-w-[1600px] min-w-0 items-center gap-2.5 rounded-[20px] border-0 bg-surface-primary px-3 shadow-none xl:gap-3 xl:px-4">
        <nav
          aria-label="Desktop dashboard navigation"
          className="grid min-w-0 flex-1 grid-cols-10 items-center gap-0.5 min-[1180px]:gap-1 2xl:gap-1.5"
        >
          {DESKTOP_HEADER_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                data-active={active ? "true" : "false"}
                className={`${desktopNavItemBaseClass} ${
                  active
                    ? desktopNavItemActiveClass
                    : desktopNavItemInactiveClass
                }`}
              >
                <Icon
                  strokeWidth={2.1}
                  aria-hidden="true"
                  className="h-[18px] w-[18px] min-[1180px]:h-5 min-[1180px]:w-5 2xl:h-[22px] 2xl:w-[22px]"
                />
                {active ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-[30%] bottom-0 h-0.5 rounded-full bg-brand"
                  />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <span
          aria-hidden="true"
          className="mx-1 hidden h-8 w-px shrink-0 bg-border min-[1180px]:block"
        />

        <div className="jf-desktop-header-tools flex min-w-0 shrink-0 items-center gap-1.5 [&>button]:!border-transparent [&>button]:!bg-transparent [&>button]:!shadow-none">
          <form
            role="search"
            aria-label="Search transactions"
            onSubmit={handleSearch}
            className={`finance-focus flex h-11 shrink-0 items-center overflow-hidden rounded-full border transition-[width,background-color,border-color,box-shadow] duration-300 ease-out ${
              searchOpen
                ? "w-[clamp(12rem,22vw,18rem)] border-border bg-surface-inset shadow-none"
                : "w-11 border-transparent bg-transparent hover:bg-hover"
            }`}
          >
            <button
              data-header-search-trigger
              type={searchOpen ? "submit" : "button"}
              aria-label={
                searchOpen ? "Search transactions" : "Open transaction search"
              }
              onClick={() => {
                if (!searchOpen) setSearchOpen(true);
              }}
              className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-secondary transition-[background-color,color,transform] duration-150 hover:text-text-primary"
            >
              <Search size={20} strokeWidth={2.1} aria-hidden="true" />
            </button>

            <label htmlFor="desktop-inline-transaction-search" className="sr-only">
              Search transactions
            </label>
            <input
              ref={searchInputRef}
              id="desktop-inline-transaction-search"
              type="search"
              autoComplete="off"
              tabIndex={searchOpen ? 0 : -1}
              aria-hidden={!searchOpen}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeSearch();
                }
              }}
              placeholder="Search transactions..."
              className={`min-w-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary transition-[width,opacity] duration-200 ${
                searchOpen
                  ? "mr-1 w-full flex-1 opacity-100"
                  : "pointer-events-none w-0 opacity-0"
              }`}
            />

            <button
              type="button"
              aria-label="Close transaction search"
              tabIndex={searchOpen ? 0 : -1}
              onClick={closeSearch}
              className={`finance-focus mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-text-secondary transition-[opacity,transform,background-color,color] duration-200 hover:bg-hover hover:text-text-primary ${
                searchOpen
                  ? "scale-100 opacity-100"
                  : "pointer-events-none scale-90 opacity-0"
              }`}
            >
              <X size={16} strokeWidth={2.1} aria-hidden="true" />
            </button>
          </form>

          {notificationSlot}
          <JamalMenu align="right" placement="bottom" variant="avatar" />
        </div>
      </div>
    </header>
  );
}
