import type { ReactNode } from "react";

import DashboardEmptyStateSync from "@/components/dashboard/DashboardEmptyStateSync";

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
      margin-top: 0 !important;
      align-self: stretch;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * > * {
      height: 100% !important;
      min-height: 0;
    }

    /* Keep the content-heavy primary cards tall enough for charts and holdings. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2),
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      height: 450px !important;
      min-height: 450px !important;
    }

    /* Let the supporting row size itself from real content instead of forcing the primary-card height. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1),
    .dashboard-overview-layout > div.grid:last-child > :nth-child(1),
    .dashboard-overview-layout > div.grid:last-child > :nth-child(2),
    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      height: auto !important;
      min-height: 0 !important;
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

    /*
     * Goals Progress sets the supporting-row height. Let Spending Breakdown and
     * Spend Record use that same internal height instead of leaving spare space
     * at the bottom. The three outer card heights remain unchanged.
     */
    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > div.mt-4.grid {
      align-items: stretch !important;
    }

    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > div.mt-4.grid
      > div:first-child {
      display: flex;
      min-height: 0;
      align-items: center;
      justify-content: center;
    }

    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > div.mt-4.grid
      > div:last-child {
      display: flex;
      min-height: 0;
      flex-direction: column;
      justify-content: space-evenly;
      padding-block: 0.125rem;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(1)
      > section
      > div:last-child {
      display: flex;
      min-height: 0 !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(1)
      > section
      > div:last-child
      > div {
      min-height: 0;
      flex: 1 1 auto;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(1)
      > section
      > div:last-child
      > div
      > div:last-child:has(> [data-chart-tone]) {
      display: flex !important;
      min-height: 0 !important;
      flex: 1 1 auto !important;
      margin-top: 0.75rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(1)
      > section
      > div:last-child
      > div
      > div:last-child
      > [data-chart-tone] {
      height: 100% !important;
      min-height: 0 !important;
      flex: 1 1 auto;
    }

    /* Keep recent transactions full width and content-sized. */
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
      align-items: stretch !important;
      gap: 1.25rem !important;
    }

    /* Keep only the donut and three compact holding lines in the portfolio body.
       Data, allocation logic, sparklines and animations stay unchanged. */
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child {
      display: flex !important;
      width: min(100%, 360px) !important;
      max-width: 360px !important;
      min-width: 0 !important;
      flex-direction: column !important;
      justify-self: center !important;
      gap: 0.2rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child
      > * {
      margin-top: 0 !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child
      > div {
      grid-template-columns: auto minmax(0, 1fr) minmax(64px, 0.72fr) auto !important;
      gap: 0.4rem !important;
      border: 0 !important;
      border-radius: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      padding: 0.35rem 0.2rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child
      > div
      > :first-child {
      width: 28px !important;
      height: 28px !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child
      > div
      > svg {
      height: 1.65rem !important;
      min-width: 60px !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > header
      + div.grid
      > div:last-child
      > p {
      display: none !important;
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
      {overviewLayout ? <DashboardEmptyStateSync /> : null}
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
