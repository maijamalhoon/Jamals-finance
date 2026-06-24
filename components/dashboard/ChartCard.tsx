import type { ReactNode } from "react";

interface ChartCardProps {
  eyebrow: string;
  eyebrowIcon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  legend?: ReactNode;
  legendPlacement?: "bottom" | "header";
  children: ReactNode;
  className?: string;
}

export default function ChartCard({
  eyebrow,
  eyebrowIcon,
  title,
  description,
  action,
  legend,
  legendPlacement = "bottom",
  children,
  className = "",
}: ChartCardProps) {
  return (
    <section
      className={`dashboard-graph-card group/chart flex h-full min-h-[220px] flex-col overflow-hidden ${className}`}
    >
      <div className="mb-2 flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5 text-text-secondary">
            {eyebrowIcon ? (
              <span className="grid h-3.5 w-3.5 shrink-0 place-items-center text-active [&>svg]:h-3 [&>svg]:w-3 [&>svg]:stroke-[2.3]">
                {eyebrowIcon}
              </span>
            ) : null}
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.2em]">
              {eyebrow}
            </p>
          </div>

          <h3 className="mt-1.5 truncate text-[13px] font-semibold leading-none tracking-normal text-text-primary">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-[11px] leading-4 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0">
          {legendPlacement === "header" ? legend : action}
        </div>
      </div>

      <div className="min-h-0 flex-1">{children}</div>

      {legendPlacement === "bottom" && legend ? <div className="mt-2">{legend}</div> : null}
    </section>
  );
}
