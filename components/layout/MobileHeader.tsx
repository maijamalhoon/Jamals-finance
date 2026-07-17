"use client";

import { BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import JamalMenu from "@/components/layout/JamalMenu";
import { getRouteTitle } from "@/lib/navigation";

type MobileHeaderProps = {
  notificationSlot: ReactNode;
};

export default function MobileHeader({
  notificationSlot,
}: MobileHeaderProps) {
  const pathname = usePathname();
  const routeTitle = getRouteTitle(pathname);

  return (
    <header className="relative z-30 flex min-h-[68px] min-w-0 flex-shrink-0 items-center justify-between gap-2 border-b border-border bg-surface-primary px-3 shadow-theme print:hidden lg:hidden sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-control)] border border-brand/25 bg-brand text-primary-foreground shadow-theme">
          <BarChart3 size={17} strokeWidth={2.2} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-4 text-text-primary">
            <span className="hidden min-[390px]:inline">Jamals Finance</span>
            <span className="min-[390px]:hidden">Finance</span>
          </p>
          <p className="mt-1 truncate text-[11px] font-semibold leading-4 text-text-secondary">
            {routeTitle}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {notificationSlot}
        <JamalMenu align="right" placement="bottom" variant="avatar" />
      </div>
    </header>
  );
}
