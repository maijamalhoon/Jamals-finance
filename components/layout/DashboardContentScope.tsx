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

const TRANSACTIONS_TYPOGRAPHY_ROUTE = "/dashboard/transactions";

function usesContentTypography(pathname: string | null) {
  if (!pathname) return false;

  return CONTENT_TYPOGRAPHY_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export default function DashboardContentScope({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isTypographyPage = usesContentTypography(pathname);
  const isTransactionsPage = pathname === TRANSACTIONS_TYPOGRAPHY_ROUTE;
  const scopeClasses = [
    "jf-dashboard-content-frame mx-auto w-full max-w-[1480px] min-w-0",
    isTypographyPage ? "finance-content-typography" : "",
    isTransactionsPage ? "transactions-page-type-icons" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={scopeClasses}
      data-finance-content-typography={isTypographyPage ? "true" : undefined}
      data-transactions-type-icons={isTransactionsPage ? "true" : undefined}
    >
      {children}
    </div>
  );
}
