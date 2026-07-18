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
      height: 100%;
      margin-top: 0 !important;
      align-self: stretch;
    }

    .dashboard-overview-layout > div.grid:nth-last-child(-n+2) > * > * {
      height: 100%;
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
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(2) {
      order: 21;
      grid-column: 15 / -1;
    }

    .dashboard-overview-layout > div.grid:last-child > :nth-child(3) {
      order: 30;
      grid-column: 1 / -1;
    }

    /* Let the existing portfolio design adapt to its 35% card width without
       changing its data, chart, holdings, animation, or interaction logic. */
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section {
      container-type: inline-size;
      container-name: dashboard-portfolio-card;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid {
      grid-template-columns: minmax(0, 1fr);
      align-items: start;
      gap: 1rem;
    }

    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid
      > div:first-child
      > div {
      max-width: 190px;
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

  @container dashboard-portfolio-card (min-width: 560px) {
    .dashboard-overview-layout
      > div.grid:nth-last-child(2)
      > :nth-child(2)
      > section
      > .mt-5.grid {
      grid-template-columns: minmax(180px, 0.82fr) minmax(0, 1.18fr);
      align-items: center;
      gap: 1rem;
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
