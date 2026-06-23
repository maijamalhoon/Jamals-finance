import type { ReactNode } from "react";

interface ChartCardProps {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
  legend?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function ChartCard({
  eyebrow,
  title,
  description,
  action,
  legend,
  children,
  className = "",
}: ChartCardProps) {
  return (
    <section
      className={`finance-reference-card flex h-full min-h-[320px] flex-col p-5 ${className}`}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-active">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-base font-bold tracking-normal text-text-primary">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>

      <div className="min-h-0 flex-1">{children}</div>

      {legend ? <div className="mt-4">{legend}</div> : null}
    </section>
  );
}
