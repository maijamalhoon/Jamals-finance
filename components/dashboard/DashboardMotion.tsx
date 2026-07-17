import type { ReactNode } from "react";

const dashboardOverviewStyles = `
  @media (min-width: 1024px) {
    .dashboard-overview-layout {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }

    .dashboard-overview-layout > *,
    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * {
      min-width: 0;
      grid-column: 1 / -1;
      margin-top: 0 !important;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) {
      display: contents;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      order: 10;
      grid-column: 1 / -1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      order: 11;
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 12;
      grid-column: 2;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 13;
      grid-column: 1 / -1;
    }

    .dashboard-overview-layout > :nth-last-child(3) {
      order: 20;
      grid-column: 1 / -1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      order: 21;
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      order: 22;
      grid-column: 2;
    }
  }

  @media (min-width: 1536px) {
    .dashboard-overview-layout {
      grid-template-columns:
        minmax(0, 2fr)
        minmax(260px, 0.95fr)
        minmax(280px, 1fr);
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      grid-column: 2;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      grid-column: 3;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      grid-column: 2 / 4;
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
