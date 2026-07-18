import type { ReactNode } from "react";

const dashboardOverviewStyles = `
  @media (min-width: 1536px) {
    .dashboard-overview-layout {
      display: grid;
      grid-template-columns: repeat(20, minmax(0, 1fr));
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
      height: 470px !important;
      min-height: 470px !important;
      margin-top: 0 !important;
      align-self: stretch;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * > * {
      height: 100% !important;
      min-height: 0;
    }

    /* Large-screen primary chart row: 40% / 35% / 25%. */
    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(3) {
      order: 10;
      grid-column: 1 / span 8;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(2) {
      order: 11;
      grid-column: 9 / span 7;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(2) > :nth-child(1) {
      order: 12;
      grid-column: 16 / -1;
    }

    /* Keep the requested 70% / 30% supporting row. */
    .dashboard-overview-layout > div.grid:last-child > :nth-child(1) {
      order: 20;
      grid-column: 1 / span 14;
      height: auto !important;
      min-height: 0 !important;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 21;
      grid-column: 15 / -1;
      height: auto !important;
      min-height: 0 !important;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 30;
      grid-column: 1 / -1;
      height: auto !important;
      min-height: 0 !important;
    }

    /* Portfolio stays side-by-side, but each holding uses a compact two-line
       grid so its sparkline and percentage cannot escape the 35% card. */
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid {
      grid-template-columns: minmax(145px, 0.72fr) minmax(0, 1.28fr) !important;
      align-items: center !important;
      gap: 0.75rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid
      > div:first-child
      > div {
      max-width: 170px !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid
      > div:last-child {
      min-width: 0 !important;
      gap: 0.45rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid
      > div:last-child
      > div {
      min-width: 0 !important;
      grid-template-columns: auto minmax(0, 1fr) auto !important;
      grid-template-rows: auto 22px !important;
      column-gap: 0.5rem !important;
      row-gap: 0.1rem !important;
      padding: 0.45rem 0.6rem !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid
      > div:last-child
      > div
      > :nth-child(3) {
      grid-column: 2 / 4 !important;
      grid-row: 2 !important;
      width: 100% !important;
      min-width: 0 !important;
      height: 22px !important;
      overflow: hidden !important;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid
      > div:last-child
      > div
      > :nth-child(4) {
      grid-column: 3 !important;
      grid-row: 1 !important;
      white-space: nowrap;
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
