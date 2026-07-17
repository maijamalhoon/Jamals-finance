"use client";

import Link from "next/link";
import { CircleDollarSign, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState } from "react";

import JamalMenu from "@/components/layout/JamalMenu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isNavItemActive, NAV_GROUPS } from "@/lib/navigation";

export default function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        type="button"
        aria-label="Open navigation menu"
        className="finance-focus finance-control grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] border-border bg-surface-primary p-0 text-text-primary shadow-none hover:bg-hover"
      >
        <Menu size={20} strokeWidth={2.2} aria-hidden="true" />
      </SheetTrigger>

      <SheetContent
        data-mobile-navigation-drawer
        side="left"
        showCloseButton={false}
        className="h-dvh max-h-dvh !w-[min(88vw,21rem)] max-w-[21rem] gap-0 overflow-hidden border-border bg-surface-elevated p-0"
      >
        <SheetHeader className="border-b border-border px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] bg-brand text-primary-foreground shadow-theme">
                <CircleDollarSign size={18} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-base font-black text-text-primary">
                  Jamal&apos;s Finance
                </SheetTitle>
                <SheetDescription className="mt-0.5 truncate text-xs font-medium text-text-secondary">
                  Personal workspace
                </SheetDescription>
              </div>
            </div>

            <SheetClose
              className="finance-focus grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
              aria-label="Close navigation menu"
            >
              <X size={19} strokeWidth={2.2} aria-hidden="true" />
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="border-b border-border p-3">
          <JamalMenu align="left" placement="bottom" variant="card" />
        </div>

        <nav
          aria-label="Mobile dashboard navigation"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="space-y-5">
            {NAV_GROUPS.map((group) => (
              <section
                key={group.label}
                aria-labelledby={`mobile-navigation-${group.label.toLowerCase()}`}
              >
                <h2
                  id={`mobile-navigation-${group.label.toLowerCase()}`}
                  className="px-2 text-[10px] font-black uppercase tracking-[0.14em] text-text-tertiary"
                >
                  {group.label}
                </h2>
                <div className="mt-1.5 space-y-1">
                  {group.items.map(({ label, href, icon: Icon }) => {
                    const active = isNavItemActive(pathname, href);

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`finance-focus relative flex min-h-12 min-w-0 items-center gap-3 rounded-[var(--radius-control)] border px-2.5 py-2 text-sm font-bold transition-[background-color,border-color,color,transform] active:scale-[0.985] ${
                          active
                            ? "border-brand/20 bg-brand/10 text-brand"
                            : "border-transparent text-text-secondary hover:border-border hover:bg-hover hover:text-text-primary"
                        }`}
                      >
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-y-2 left-0 w-0.5 rounded-r-full bg-brand"
                          />
                        ) : null}
                        <span
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-[12px] ${
                            active ? "bg-brand/12" : "bg-surface-secondary"
                          }`}
                        >
                          <Icon size={17} strokeWidth={2.2} aria-hidden="true" />
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
