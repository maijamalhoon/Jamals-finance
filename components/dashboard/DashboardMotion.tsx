import type { ReactNode } from "react";

const dashboardOverviewStyles = `
  @media (min-width: 1536px) {
    .dashboard-overview-layout {
      display: grid;
      grid-template-columns: minmax(0, 7fr) minmax(300px, 3fr);
      align-items: stretch;
      gap: 1.5rem;
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
      margin-top: 0 !important;
      align-self: stretch;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * > * {
      height: 100%;
    }

    /* Large-screen dashboard order requested in the design reference. */
    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      order: 10;
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 11;
      grid-column: 2;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      order: 20;
      grid-column: 1;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      order: 21;
      grid-column: 2;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 30;
      grid-column: 1 / -1;
    }

    /* The portfolio card is retained on tablet and mobile, while the exact
       five-card structure is used on large viewports. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      display: none;
    }

    /* Keep the 70% spending card compact and aligned with the goals card. */
    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > .mt-4.grid {
      grid-template-columns: minmax(220px, 0.82fr) minmax(0, 1.18fr);
      align-items: center;
      gap: 1.5rem;
    }

    .dashboard-overview-layout
      > div.grid:last-child
      > :nth-child(1)
      > section
      > .mt-4.grid
      > div:first-child
      > div {
      max-width: 260px;
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
