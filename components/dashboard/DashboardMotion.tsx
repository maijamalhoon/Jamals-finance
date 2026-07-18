import type { ReactNode } from "react";

const dashboardOverviewStyles = `
  @media (min-width: 1280px) {
    .dashboard-overview-layout {
      display: grid;
      grid-template-columns: repeat(20, minmax(0, 1fr));
      align-items: stretch;
      gap: 1rem;
    }

    .dashboard-overview-layout > * {
      min-width: 0;
      grid-column: 1 / -1;
      margin-top: 0 !important;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) {
      display: contents;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * {
      min-width: 0;
      height: 470px !important;
      min-height: 470px !important;
      margin-top: 0 !important;
      align-self: stretch;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * > * {
      height: 100% !important;
      min-height: 0;
    }

    /* Primary row: Income vs Expenses 45%, Portfolio Overview 55%. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      order: 10;
      grid-column: 1 / span 9;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      order: 11;
      grid-column: 10 / -1;
    }

    /* Supporting row: Spending 50%, Month-to-Date 25%, Goals 25%. */
    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      order: 20;
      grid-column: 1 / span 10;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      order: 21;
      grid-column: 11 / span 5;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 22;
      grid-column: 16 / -1;
    }

    /* Keep recent transactions full width while matching the feature-card height. */
    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 30;
      grid-column: 1 / -1;
    }

    /* Keep both donuts identical in diameter and prevent portfolio overlap. */
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid {
      grid-template-columns: minmax(220px, 0.82fr) minmax(0, 1.18fr) !important;
      align-items: center !important;
      gap: 1rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:first-child
      > div,
    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > div.mt-4.grid
      > div:first-child
      > div {
      width: min(100%, 240px) !important;
      max-width: 240px !important;
    }

    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > div.mt-4.grid {
      grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.1fr) !important;
      align-items: center !important;
      gap: 1.25rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child
      > div {
      grid-template-columns: auto minmax(0, 1fr) minmax(72px, 0.85fr) auto !important;
      gap: 0.5rem !important;
      padding: 0.625rem 0.75rem !important;
    }
  }

  @media (min-width: 1280px) and (max-width: 1535px) {
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(1)
      > section
      > div:nth-child(2)
      > div
      > div:first-child {
      grid-template-columns: minmax(0, 1fr) !important;
      align-items: stretch !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(1)
      > section
      > div:nth-child(2)
      > div
      > div:first-child
      > div:last-child {
      justify-self: start;
      text-align: left;
    }
  }
`;

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function DashboardMotion({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const overviewLayout = className.split(/\s+/).includes("dashboard-overview");
  const resolvedClassName = overviewLayout
    ? `${className} dashboard-overview-layout`
    : className;

  return (
    <>
      {overviewLayout ? <style>{dashboardOverviewStyles}</style> : null}
      <div className={joinClassNames("jf-dashboard-motion", resolvedClassName)}>
        {children}
      </div>
    </>
  );
}

export function DashboardMotionItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={joinClassNames("jf-dashboard-motion-item", className)}>
      {children}
    </div>
  );
}
