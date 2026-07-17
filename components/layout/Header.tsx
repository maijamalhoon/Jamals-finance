"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowLeftRight,
  BarChart3,
  Check,
  ChevronDown,
  FileBarChart,
  ListFilter,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  WalletCards,
  X,
  type LucideIcon,
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
  isDesktopMoreActive,
  isNavItemActive,
} from "@/lib/navigation";

const TransactionModal = dynamic(
  () => import("@/components/dashboard/TransactionModal"),
  { ssr: false },
);

type HeaderProps = {
  notificationSlot: ReactNode;
};

const desktopNavItemBaseClass =
  "finance-focus relative flex min-h-12 min-w-0 items-center gap-1.5 rounded-[14px] border px-2.5 text-xs font-bold transition-[background-color,border-color,color,transform] duration-150 xl:gap-2 xl:px-3.5 xl:text-sm";
const desktopNavItemActiveClass =
  "border-transparent bg-brand/10 text-brand shadow-none active:bg-brand/15";
const desktopNavItemInactiveClass =
  "border-transparent text-text-secondary hover:bg-hover hover:text-text-primary active:scale-[0.985] active:bg-surface-inset";

type DesktopNavMenuEntry = {
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  action?: "add-income" | "add-expense";
};

const DESKTOP_NAV_MENU_ENTRIES: Record<string, DesktopNavMenuEntry[]> = {
  "/dashboard/accounts": [
    {
      label: "All accounts",
      description: "Balances and account history",
      icon: WalletCards,
      href: "/dashboard/accounts",
    },
    {
      label: "Transfer activity",
      description: "Money moved between accounts",
      icon: ArrowLeftRight,
      href: "/dashboard/transactions?type=transfer",
    },
    {
      label: "All account activity",
      description: "Search the complete ledger",
      icon: ListFilter,
      href: "/dashboard/transactions",
    },
  ],
  "/dashboard/income": [
    {
      label: "Income overview",
      description: "Totals, sources, and history",
      icon: TrendingUp,
      href: "/dashboard/income",
    },
    {
      label: "Add income",
      description: "Record money received",
      icon: Plus,
      action: "add-income",
    },
    {
      label: "Income transactions",
      description: "Filtered transaction history",
      icon: ListFilter,
      href: "/dashboard/transactions?type=income",
    },
  ],
  "/dashboard/expenses": [
    {
      label: "Expense overview",
      description: "Totals, categories, and history",
      icon: TrendingDown,
      href: "/dashboard/expenses",
    },
    {
      label: "Add expense",
      description: "Record money spent",
      icon: Plus,
      action: "add-expense",
    },
    {
      label: "Expense transactions",
      description: "Filtered transaction history",
      icon: ListFilter,
      href: "/dashboard/transactions?type=expense",
    },
  ],
  "/dashboard/analytics": [
    {
      label: "Analytics overview",
      description: "Key metrics and trends",
      icon: BarChart3,
      href: "/dashboard/analytics",
    },
    {
      label: "Cash flow",
      description: "Income versus spending",
      icon: Activity,
      href: "/dashboard/analytics#cash-flow",
    },
    {
      label: "Spending analysis",
      description: "Category and account breakdown",
      icon: TrendingDown,
      href: "/dashboard/analytics#spending-analysis",
    },
    {
      label: "Reports",
      description: "Monthly financial reporting",
      icon: FileBarChart,
      href: "/dashboard/reports",
    },
  ],
};

export default function Header({ notificationSlot }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "income" | "expense" | null
  >(null);
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

  function handleMenuEntry(entry: DesktopNavMenuEntry) {
    if (entry.action === "add-income") {
      setTransactionType("income");
      return;
    }

    if (entry.action === "add-expense") {
      setTransactionType("expense");
      return;
    }

    if (entry.href) router.push(entry.href);
  }

  return (
    <>
      <header className="jf-desktop-header relative z-30 min-w-0 flex-shrink-0 bg-background px-1.5 py-1.5">
        <div className="mx-auto flex min-h-[4.75rem] w-full max-w-[1600px] min-w-0 items-center gap-2.5 rounded-[20px] border border-border bg-surface-primary px-3 shadow-theme xl:gap-3 xl:px-4">
          <nav
            aria-label="Desktop dashboard navigation"
            className="flex min-w-0 flex-1 items-center gap-1 overflow-visible xl:gap-1.5"
          >
            {DESKTOP_PRIMARY_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = isNavItemActive(pathname, href);
              const menuEntries = DESKTOP_NAV_MENU_ENTRIES[href];

              if (menuEntries) {
                return (
                  <DropdownMenu key={href}>
                    <DropdownMenuTrigger
                      type="button"
                      aria-label={`Open ${label} navigation`}
                      aria-current={active ? "page" : undefined}
                      data-active={active ? "true" : "false"}
                      className={`${desktopNavItemBaseClass} data-popup-open:bg-brand/10 data-popup-open:text-brand ${
                        active
                          ? desktopNavItemActiveClass
                          : desktopNavItemInactiveClass
                      }`}
                    >
                      <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
                      <span className="truncate">{label}</span>
                      <ChevronDown size={13} strokeWidth={2.2} aria-hidden="true" />
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                        />
                      ) : null}
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      align="start"
                      side="bottom"
                      sideOffset={10}
                      className="w-80 max-w-[calc(100vw-2rem)] rounded-[var(--radius-tile)] border border-border bg-surface-elevated p-1.5 shadow-[var(--shadow-soft)]"
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-text-tertiary">
                          {label}
                        </DropdownMenuLabel>
                        {menuEntries.map((entry) => {
                          const EntryIcon = entry.icon;

                          return (
                            <DropdownMenuItem
                              key={`${entry.label}-${entry.href ?? entry.action}`}
                              onClick={() => handleMenuEntry(entry)}
                              className="min-h-14 cursor-pointer gap-3 rounded-[var(--radius-control)] px-2.5 py-2 text-text-secondary focus:bg-hover focus:text-text-primary"
                            >
                              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-surface-secondary text-text-primary">
                                <EntryIcon
                                  size={16}
                                  strokeWidth={2.1}
                                  aria-hidden="true"
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold text-text-primary">
                                  {entry.label}
                                </span>
                                <span className="mt-0.5 block truncate text-[11px] font-medium text-text-tertiary">
                                  {entry.description}
                                </span>
                              </span>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

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
                  <Icon size={17} strokeWidth={2.1} aria-hidden="true" />
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
                className={`${desktopNavItemBaseClass} data-popup-open:bg-brand/10 data-popup-open:text-brand ${
                  moreActive
                    ? desktopNavItemActiveClass
                    : desktopNavItemInactiveClass
                }`}
              >
                <span>More</span>
                <ChevronDown size={14} strokeWidth={2.1} aria-hidden="true" />
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
                sideOffset={10}
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
                              <Icon
                                size={15}
                                strokeWidth={2.2}
                                aria-hidden="true"
                              />
                            </span>
                            <span className="min-w-0 flex-1 truncate">
                              {label}
                            </span>
                            {active ? (
                              <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em]">
                                <Check
                                  size={12}
                                  strokeWidth={2.4}
                                  aria-hidden="true"
                                />
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
          </nav>

          <span
            aria-hidden="true"
            className="mx-1 hidden h-8 w-px shrink-0 bg-border min-[1180px]:block"
          />

          <div className="flex shrink-0 items-center gap-1.5 [&>button]:!border-transparent [&>button]:!bg-transparent [&>button]:!shadow-none">
            <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
              <SheetTrigger
                type="button"
                aria-label="Open transaction search"
                className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
              >
                <Search size={20} strokeWidth={2.1} aria-hidden="true" />
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
                        Find transactions by the terms already supported on the
                        transactions page.
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
      </header>

      {transactionType ? (
        <TransactionModal
          open
          defaultType={transactionType}
          onClose={() => setTransactionType(null)}
          onSuccess={() => {
            setTransactionType(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
