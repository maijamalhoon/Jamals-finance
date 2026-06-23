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
      className={`dashboard-graph-card flex h-full min-h-[258px] flex-col ${className}`}
    >
      <div className="mb-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#758093]">
            {eyebrowIcon ? (
              <span className="text-[#4f83ff] [&>svg]:h-[14px] [&>svg]:w-[14px] [&>svg]:stroke-[2.2]">
                {eyebrowIcon}
              </span>
            ) : null}
            <span>{eyebrow}</span>
          </p>
          <h3 className="mt-1.5 text-[16px] font-semibold leading-none tracking-normal text-[#050816] dark:text-text-primary">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-[#8a93a4] dark:text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {legendPlacement === "header" ? legend : action}
      </div>

      <div className="min-h-0 flex-1">{children}</div>

      {legendPlacement === "bottom" && legend ? <div className="mt-2">{legend}</div> : null}
    </section>
  );
}
