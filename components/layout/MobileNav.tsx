"use client";

import Link from "next/link";
import { CircleDollarSign, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

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

type MobileNavProps = {
  notificationSlot: ReactNode;
};

export default function MobileNav({ notificationSlot }: MobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        type="button"
        aria-label="Open navigation menu"
        className="finance-focus fixed left-4 top-[max(1rem,env(safe-area-inset-top))] z-40 grid size-11 shrink-0 place-items-center rounded-[14px] border border-border bg-card/92 p-0 text-text-primary shadow-[0_8px_20px_rgb(15_23_42_/_0.1)] backdrop-blur-md transition-[transform,background-color,border-color,box-shadow] hover:-translate-y-0.5 hover:border-brand/30 hover:bg-surface-elevated active:scale-[0.97] dark:border-border-strong/70 dark:bg-surface-elevated/92 dark:shadow-[0_10px_24px_rgb(0_0_0_/_0.28)] print:hidden lg:hidden"
      >
        <span
          aria-hidden="true"
          className="flex flex-col items-center justify-center gap-1.5"
        >
          <span className="h-0.5 w-5 rounded-full bg-current" />
          <span className="h-0.5 w-3 rounded-full bg-current" />
        </span>
      </SheetTrigger>

      <SheetContent
        data-mobile-navigation-drawer
        side="left"
        showCloseButton={false}
        className="h-dvh max-h-dvh !w-[min(88vw,20.5rem)] max-w-[20.5rem] gap-0 overflow-hidden rounded-r-[28px] border-border bg-surface-elevated/98 p-0 shadow-[24px_0_70px_rgb(15_23_42_/_0.22)] backdrop-blur-xl sm:!w-[23rem] sm:max-w-[23rem] dark:shadow-[24px_0_70px_rgb(0_0_0_/_0.5)]"
      >
        <SheetHeader className="border-b border-border/80 px-3.5 pb-3 pt-[max(0.85rem,env(safe-area-inset-top))] sm:px-4 sm:pb-3.5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-brand text-primary-foreground shadow-theme">
                <CircleDollarSign size={17} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[15px] font-black text-text-primary sm:text-base">
                  Jamal&apos;s Finance
                </SheetTitle>
                <SheetDescription className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
                  Personal workspace
                </SheetDescription>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-0.5">
              <div className="flex scale-[0.92] items-center sm:scale-100">{notificationSlot}</div>
              <SheetClose
                className="finance-focus grid h-10 w-10 shrink-0 place-items-center rounded-[13px] text-text-secondary transition-colors hover:bg-hover hover:text-text-primary"
                aria-label="Close navigation menu"
              >
                <X size={18} strokeWidth={2.2} aria-hidden="true" />
              </SheetClose>
            </div>
          </div>
        </SheetHeader>

        <div className="border-b border-border/80 px-3 py-2.5 sm:px-4">
          <JamalMenu align="left" placement="bottom" variant="drawer" />
        </div>

        <nav
          aria-label="Mobile dashboard navigation"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-4"
        >
          <div className="space-y-3.5 sm:space-y-4">
            {NAV_GROUPS.map((group) => {
              const singleItem = group.items.length === 1;

              return (
                <section
                  key={group.label}
                  aria-labelledby={`mobile-navigation-${group.label.toLowerCase()}`}
                >
                  <div className="mb-1.5 flex items-center gap-2 px-1">
                    <h2
                      id={`mobile-navigation-${group.label.toLowerCase()}`}
                      className="text-[9px] font-black uppercase tracking-[0.16em] text-text-tertiary"
                    >
                      {group.label}
                    </h2>
                    <span className="h-px min-w-0 flex-1 bg-divider/75" aria-hidden="true" />
                  </div>

                  <div className={singleItem ? "grid grid-cols-1 gap-2" : "grid grid-cols-2 gap-2"}>
                    {group.items.map(({ label, href, icon: Icon }) => {
                      const active = isNavItemActive(pathname, href);

                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`finance-focus group relative flex min-h-[3.35rem] min-w-0 items-center gap-2 rounded-[15px] border px-2.5 py-2 text-[12px] font-extrabold transition-[background-color,border-color,color,box-shadow,transform] active:scale-[0.985] sm:min-h-14 sm:px-3 sm:text-[13px] ${
                            active
                              ? "border-brand bg-brand text-primary-foreground shadow-[0_8px_18px_color-mix(in_srgb,var(--brand)_22%,transparent)]"
                              : "border-border/75 bg-surface-secondary/65 text-text-secondary shadow-[inset_0_1px_0_rgb(255_255_255_/_0.16)] hover:border-brand/20 hover:bg-surface-soft hover:text-text-primary"
                          }`}
                        >
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] transition-colors sm:h-8.5 sm:w-8.5 ${
                              active
                                ? "bg-white/16 text-primary-foreground"
                                : "bg-surface-primary text-text-secondary group-hover:text-brand"
                            }`}
                          >
                            <Icon size={16} strokeWidth={2.15} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1 truncate">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
