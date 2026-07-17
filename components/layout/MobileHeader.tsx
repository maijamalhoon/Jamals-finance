"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import MobileNav from "@/components/layout/MobileNav";
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
    <header className="relative z-30 flex min-h-[60px] min-w-0 flex-shrink-0 items-center gap-2 border-b border-border bg-surface-primary/95 px-2.5 backdrop-blur-xl print:hidden lg:hidden sm:px-4">
      <MobileNav />

      <div className="min-w-0 flex-1 px-1">
        <h1 className="truncate text-sm font-black leading-5 text-text-primary">
          {routeTitle}
        </h1>
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary">
          Jamal&apos;s Finance
        </p>
      </div>

      <div className="flex shrink-0 items-center">{notificationSlot}</div>
    </header>
  );
}
