"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const CONTENT_TYPOGRAPHY_ROUTES = [
  "/dashboard/income",
  "/dashboard/expenses",
  "/dashboard/payables",
  "/dashboard/goals",
  "/dashboard/investments",
  "/dashboard/analytics",
  "/dashboard/ai-insights",
] as const;

const REMAINING_TYPE_ICON_ROUTES = [
  "/dashboard/accounts",
  "/dashboard/reports",
] as const;

const TRANSACTIONS_TYPOGRAPHY_ROUTE = "/dashboard/transactions";

function matchesRouteGroup(
  pathname: string | null,
  routes: readonly string[],
) {
  if (!pathname) return false;

  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function DashboardContentScope({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isTypographyPage = matchesRouteGroup(
    pathname,
    CONTENT_TYPOGRAPHY_ROUTES,
  );
  const isRemainingTypeIconPage = matchesRouteGroup(
    pathname,
    REMAINING_TYPE_ICON_ROUTES,
  );
  const isTransactionsPage = pathname === TRANSACTIONS_TYPOGRAPHY_ROUTE;
  const scopeClasses = [
    "jf-dashboard-content-frame mx-auto w-full max-w-[1480px] min-w-0",
    isTypographyPage ? "finance-content-typography" : "",
    isRemainingTypeIconPage ? "finance-remaining-type-icons" : "",
    isTransactionsPage ? "transactions-page-type-icons" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={scopeClasses}
      data-finance-content-typography={isTypographyPage ? "true" : undefined}
      data-finance-remaining-type-icons={
        isRemainingTypeIconPage ? "true" : undefined
      }
      data-transactions-type-icons={isTransactionsPage ? "true" : undefined}
    >
      {children}
    </div>
  );
}
