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
    <div className="space-y-5 pb-8">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[126px]" delay={index * 35}>
            <div className="flex items-start justify-between">
              <Line className="h-9 w-9 rounded-[16px]" delay={index * 40} />
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

      <LoadingPanel className="min-h-[180px]" delay={120}>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_2fr] lg:items-center">
          <div className="space-y-3">
            <Line className="h-3 w-28" />
            <Line className="h-8 w-56 max-w-full" />
            <Line className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Line key={index} className="h-20 rounded-[18px]" delay={index * 35} />
            ))}
          </div>
        </div>
      </LoadingPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr] lg:items-stretch">
        <LoadingPanel className="min-h-[300px]" delay={160}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Line className="h-4 w-36" />
              <Line className="h-3 w-28" />
            </div>
            <Line className="h-8 w-32 rounded-[14px]" />
          </div>
          <Line className="h-[220px] w-full" />
        </LoadingPanel>
        {Array.from({ length: 2 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[300px]" delay={200 + index * 40}>
            <div className="space-y-3">
              <Line className="h-4 w-32" />
              <Line className="h-3 w-24" />
              <Line className="h-44 w-full" />
              <Line className="h-3 w-2/3" />
            </div>
          </LoadingPanel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[128px]" delay={260 + index * 35}>
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        {Array.from({ length: 3 }).map((_, index) => (
          <LoadingPanel key={index} className="min-h-[280px]" delay={340 + index * 45}>
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
    </div>
  );
}
