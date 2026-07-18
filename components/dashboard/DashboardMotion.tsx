import type { ReactNode } from "react";

const dashboardOverviewStyles = `
  @media (min-width: 1024px) {
    .dashboard-overview-layout {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
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
      height: 100%;
      grid-column: 1 / -1;
      margin-top: 0 !important;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * > * {
      height: 100%;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      order: 10;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      order: 11;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      order: 20;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      order: 21;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 30;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 31;
    }

    /* The portfolio uses its horizontal desktop composition as soon as there
       is enough card width, rather than waiting for an ultra-wide viewport. */
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid {
      grid-template-columns: minmax(220px, 0.86fr) minmax(280px, 1.14fr);
      align-items: center;
    }

    /* Spending stays compact on desktop by keeping the donut and legend next
       to one another. Data, chart logic, and animation remain unchanged. */
    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > .mt-4.grid {
      grid-template-columns: minmax(190px, 0.9fr) minmax(0, 1.1fr);
      align-items: center;
      gap: 1.25rem;
    }

    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > .mt-4.grid
      > div:first-child
      > div {
      max-width: 230px;
    }
  }

  @media (min-width: 1280px) {
    .dashboard-overview-layout {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      gap: 1.25rem;
    }

    /* Primary visual row: compact spend story plus the richer portfolio. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      grid-column: 1 / span 5;
      min-height: 400px;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      grid-column: 6 / -1;
      min-height: 400px;
    }

    /* Analysis row: the wider trend chart and a compact horizontal breakdown. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      grid-column: 1 / span 7;
      min-height: 350px;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      grid-column: 8 / -1;
      min-height: 350px;
    }

    /* Activity row: goals get a focused rail while transactions keep table room. */
    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      grid-column: 1 / span 4;
      min-height: 330px;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      grid-column: 5 / -1;
      min-height: 330px;
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
