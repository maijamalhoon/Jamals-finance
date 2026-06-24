import type { ReactNode } from "react";

function Line({
  className,
  delay = 0,
}: {
  className: string;
  delay?: number;
}) {
  return (
    <div
      className={`finance-skeleton ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}

function LoadingPanel({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`finance-loading-panel motion-reveal ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6 pb-10">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[142px]" delay={index * 35}>
            <div className="flex items-start justify-between">
              <Line className="h-11 w-11 rounded-[18px]" delay={index * 40} />
              <Line className="h-7 w-20 rounded-full" delay={index * 45} />
            </div>
            <div className="mt-7 space-y-2">
              <Line className="h-3 w-24" />
              <Line className="h-7 w-40 max-w-full" />
            </div>
            <Line className="mt-5 h-1 w-full rounded-full" />
          </LoadingPanel>
        ))}
      </div>

      <LoadingPanel className="min-h-[350px]" delay={120}>
        <div className="space-y-5">
          <div className="space-y-3">
            <Line className="h-3 w-28" />
            <Line className="h-8 w-56 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line key={index} className="h-20 rounded-[18px]" delay={index * 35} />
            ))}
          </div>
          <Line className="h-px w-full rounded-none" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line
                key={index}
                className="h-16 rounded-[18px]"
                delay={index * 35}
              />
            ))}
          </div>
          <Line className="h-24 rounded-[22px]" />
        </div>
      </LoadingPanel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] xl:items-stretch">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[258px]" delay={180 + index * 40}>
            <div className="space-y-3">
              <Line className="h-4 w-32" />
              <Line className="h-3 w-24" />
              <Line className="h-36 w-full rounded-[22px]" />
              <Line className="h-10 w-full rounded-[18px]" />
            </div>
          </LoadingPanel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[360px]" delay={320 + index * 45}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Line className="h-4 w-36" />
                <Line className="h-3 w-28" />
              </div>
              <Line className="h-44 w-full" />
              <div className="space-y-2">
                <Line className="h-3 w-full" />
                <Line className="h-3 w-3/4" />
              </div>
            </div>
          </LoadingPanel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[128px]" delay={460 + index * 35}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <Line className="h-3 w-28" />
                <Line className="h-6 w-32 max-w-full" />
              </div>
              <Line className="h-10 w-10 rounded-[16px]" />
            </div>
            <Line className="mt-4 h-4 w-4/5" />
          </LoadingPanel>
        ))}
      </div>
    </div>
  );
}
