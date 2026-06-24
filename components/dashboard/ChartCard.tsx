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
      className={`dashboard-graph-card group/chart flex h-full min-h-[258px] flex-col overflow-hidden ${className}`}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {eyebrowIcon ? (
            <span className="finance-icon-bubble h-8 w-8 rounded-[14px] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:stroke-[2.2]">
              {eyebrowIcon}
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-text-secondary">
              {eyebrow}
            </p>
            <h3 className="mt-1.5 text-[16px] font-semibold leading-none tracking-normal text-text-primary">
              {title}
            </h3>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-text-secondary">
                {description}
              </p>
            ) : null}
          </div>
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
