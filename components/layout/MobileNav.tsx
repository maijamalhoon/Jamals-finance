"use client";

import Link from "next/link";
import { MoreHorizontal, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

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
  isNavItemActive,
  MOBILE_MORE_NAV_GROUPS,
  MOBILE_MORE_NAV_ITEMS,
  MOBILE_PRIMARY_NAV_ITEMS,
} from "@/lib/navigation";

const primaryNavItemBaseClass =
  "finance-focus relative flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--radius-tile)] px-0.5 text-[10px] font-bold transition-colors min-[360px]:text-[11px]";
const activePrimaryNavItemClass =
  "bg-brand text-primary-foreground shadow-theme active:bg-brand-pressed";
const inactivePrimaryNavItemClass =
  "text-text-secondary hover:bg-hover hover:text-text-primary active:bg-surface-inset active:text-text-primary";

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_MORE_NAV_ITEMS.some((item) =>
    isNavItemActive(pathname, item.href),
  );

  return (
    <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
      <nav
        aria-label="Mobile dashboard navigation"
        className="jf-mobile-nav-shell fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 print:hidden lg:hidden"
      >
        <div className="mx-auto grid w-full max-w-[32rem] grid-cols-4 gap-1 rounded-[var(--radius-card)] border border-border bg-surface-elevated p-1.5 shadow-[var(--shadow-soft)]">
          {MOBILE_PRIMARY_NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isNavItemActive(pathname, href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`${primaryNavItemBaseClass} ${
                  active
                    ? activePrimaryNavItemClass
                    : inactivePrimaryNavItemClass
                }`}
              >
                {active ? (
                  <span
                    className="absolute inset-x-5 top-1 h-0.5 rounded-full bg-primary-foreground"
                    aria-hidden="true"
                  />
                ) : null}
                <Icon
                  className="h-[18px] w-[18px] shrink-0"
                  strokeWidth={2.2}
                  aria-hidden="true"
                />
                <span className="max-w-full whitespace-nowrap leading-none">
                  {label}
                </span>
              </Link>
            );
          })}

          <SheetTrigger
            type="button"
            aria-label="Open more dashboard navigation"
            aria-current={moreActive ? "page" : undefined}
            className={`${primaryNavItemBaseClass} ${
              moreActive || moreOpen
                ? activePrimaryNavItemClass
                : inactivePrimaryNavItemClass
            }`}
          >
            {moreActive || moreOpen ? (
              <span
                className="absolute inset-x-5 top-1 h-0.5 rounded-full bg-primary-foreground"
                aria-hidden="true"
              />
            ) : null}
            <MoreHorizontal
              className="h-[18px] w-[18px] shrink-0"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            <span className="leading-none">More</span>
          </SheetTrigger>
        </div>
      </nav>

      <SheetContent
        side="right"
        showCloseButton={false}
        className="h-dvh max-h-dvh w-[min(100vw,28rem)] max-w-full gap-0 overflow-hidden border-border bg-surface-elevated p-0 sm:w-[28rem] sm:max-w-[28rem]"
      >
        <SheetHeader className="border-b border-border px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-text-primary">
                More navigation
              </SheetTitle>
              <SheetDescription className="mt-1 leading-5 text-text-secondary">
                Open the rest of your finance workspace by section.
              </SheetDescription>
            </div>
            <SheetClose
              className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary hover:bg-hover hover:text-text-primary"
              aria-label="Close more navigation"
            >
              <X size={18} aria-hidden="true" />
            </SheetClose>
          </div>
        </SheetHeader>

        <nav
          aria-label="More dashboard navigation"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5"
        >
          <div className="space-y-5">
            {MOBILE_MORE_NAV_GROUPS.map((group) => (
              <section key={group.label} aria-labelledby={`more-${group.label}`}>
                <h2
                  id={`more-${group.label}`}
                  className="px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-text-tertiary"
                >
                  {group.label}
                </h2>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {group.items.map(({ label, href, icon: Icon }) => {
                    const active = isNavItemActive(pathname, href);

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMoreOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`finance-focus relative flex min-h-11 min-w-0 items-center gap-3 rounded-[var(--radius-tile)] border px-3 py-2 text-sm font-semibold transition-colors ${
                          active
                            ? "border-brand/30 bg-brand/10 text-brand"
                            : "border-transparent text-text-secondary hover:border-border hover:bg-hover hover:text-text-primary"
                        }`}
                      >
                        {active ? (
                          <span
                            className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-border bg-surface-primary">
                          <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
