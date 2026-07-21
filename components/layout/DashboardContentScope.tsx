"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

import AnimationPerformanceMode from "@/components/performance/NoAnimationPerformanceMode";
import { getDocumentAnimationMode } from "@/lib/animation-preference";

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

const PAGE_HEADING_META = {
  "/dashboard/transactions": {
    key: "transactions",
    label: "Transactions",
    accent: "var(--info)",
  },
  "/dashboard/accounts": {
    key: "accounts",
    label: "Accounts",
    accent: "var(--accounts, var(--info))",
  },
  "/dashboard/income": {
    key: "income",
    label: "Income",
    accent: "var(--income)",
  },
  "/dashboard/expenses": {
    key: "expenses",
    label: "Expenses",
    accent: "var(--expense)",
  },
  "/dashboard/goals": {
    key: "goals",
    label: "Goals",
    accent: "var(--goals)",
  },
  "/dashboard/payables": {
    key: "payables",
    label: "Payables",
    accent: "var(--payables)",
  },
  "/dashboard/investments": {
    key: "investments",
    label: "Investments",
    accent: "var(--investment)",
  },
  "/dashboard/analytics": {
    key: "analytics",
    label: "Analytics",
    accent: "var(--active)",
  },
  "/dashboard/ai-insights": {
    key: "ai-insights",
    label: "AI Insights",
    accent: "var(--investment)",
  },
  "/dashboard/reports": {
    key: "reports",
    label: "Reports",
    accent: "var(--info)",
  },
  "/dashboard/settings": {
    key: "settings",
    label: "Settings",
    accent: "var(--text-secondary)",
  },
} as const;

type PageHeadingMeta = (typeof PAGE_HEADING_META)[keyof typeof PAGE_HEADING_META];

const PAGE_HEADING_ACTION_KEYS = new Set<string>([
  "accounts",
  "income",
  "expenses",
  "goals",
  "payables",
  "investments",
  "analytics",
  "reports",
]);

function matchesRouteGroup(
  pathname: string | null,
  routes: readonly string[],
) {
  if (!pathname) return false;

  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getPageHeadingMeta(pathname: string | null): PageHeadingMeta | null {
  if (!pathname) return null;
  return PAGE_HEADING_META[pathname as keyof typeof PAGE_HEADING_META] ?? null;
}

export default function DashboardContentScope({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [initialDocumentReady, setInitialDocumentReady] = useState(false);
  const isTypographyPage = matchesRouteGroup(
    pathname,
    CONTENT_TYPOGRAPHY_ROUTES,
  );
  const isRemainingTypeIconPage = matchesRouteGroup(
    pathname,
    REMAINING_TYPE_ICON_ROUTES,
  );
  const isTransactionsPage = pathname === TRANSACTIONS_TYPOGRAPHY_ROUTE;
  const pageHeading = getPageHeadingMeta(pathname);
  const gateInitialReveal = pageHeading !== null;
  const scopeClasses = [
    "jf-dashboard-content-frame mx-auto w-full max-w-[1480px] min-w-0",
    isTypographyPage ? "finance-content-typography" : "",
    isRemainingTypeIconPage ? "finance-remaining-type-icons" : "",
    isTransactionsPage ? "transactions-page-type-icons" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const headingStyle = pageHeading
    ? ({ "--jf-page-accent": pageHeading.accent } as CSSProperties)
    : undefined;

  useEffect(() => {
    const animationMode = getDocumentAnimationMode();

    if (animationMode === "none") {
      setInitialDocumentReady(true);
      return;
    }

    let cancelled = false;
    const revealFrame = window.requestAnimationFrame(() => {
      if (!cancelled) setInitialDocumentReady(true);
    });

    // Standard and fast both reveal on the first composited frame. Fonts and
    // non-critical assets may continue settling without blocking page content.
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(revealFrame);
    };
  }, []);

  return (
    <div
      className={scopeClasses}
      style={headingStyle}
      data-finance-content-typography={isTypographyPage ? "true" : undefined}
      data-finance-remaining-type-icons={
        isRemainingTypeIconPage ? "true" : undefined
      }
      data-transactions-type-icons={isTransactionsPage ? "true" : undefined}
      data-jf-page={isTransactionsPage ? undefined : pageHeading?.key}
      data-jf-initial-reveal={
        gateInitialReveal ? (initialDocumentReady ? "ready" : "pending") : undefined
      }
    >
      <AnimationPerformanceMode />
      {isTransactionsPage ? (
        children
      ) : pageHeading ? (
        <>
          <header
            className="jf-unified-page-heading"
            aria-labelledby={`jf-${pageHeading.key}-page-title`}
          >
            <span className="jf-unified-page-accent" aria-hidden="true" />
            <h1
              id={`jf-${pageHeading.key}-page-title`}
              className="jf-unified-page-title"
            >
              {pageHeading.label}
            </h1>
            {PAGE_HEADING_ACTION_KEYS.has(pageHeading.key) ? (
              <div
                id={`jf-${pageHeading.key}-heading-actions`}
                className="jf-unified-page-actions"
              />
            ) : null}
          </header>
          <div className="jf-unified-page-body">{children}</div>
        </>
      ) : (
        children
      )}
    </div>
  );
}
