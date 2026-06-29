import type { ReactNode } from "react";

type DashboardRouteLoadingVariant =
  | "dashboard"
  | "analytics"
  | "table"
  | "cards"
  | "settings"
  | "ai";

function SkeletonLine({
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

function Panel({
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

export default function DashboardRouteLoading({
  variant = "dashboard",
}: {
  variant?: DashboardRouteLoadingVariant;
}) {
  if (variant === "analytics") {
    return (
      <div className="space-y-6 pb-10">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Panel key={index} className="min-h-[118px]" delay={index * 40}>
              <div className="space-y-3">
                <SkeletonLine className="h-4 w-32" delay={index * 20} />
                <SkeletonLine className="h-8 w-40" delay={index * 25} />
                <SkeletonLine className="h-4 w-24" delay={index * 30} />
              </div>
            </Panel>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)]">
          <Panel className="min-h-[360px]" delay={120}>
            <div className="space-y-4">
              <SkeletonLine className="h-5 w-48" />
              <SkeletonLine className="h-10 w-full rounded-[var(--oneui-control-radius)]" />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonLine
                    key={index}
                    className="h-20 rounded-[var(--oneui-control-radius)]"
                    delay={index * 20}
                  />
                ))}
              </div>
            </div>
          </Panel>

          <Panel className="min-h-[360px]" delay={160}>
            <div className="space-y-4">
              <SkeletonLine className="h-5 w-32" />
              <SkeletonLine className="h-56 rounded-[var(--oneui-card-radius)]" />
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className="space-y-6 pb-10">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-48" />
          <SkeletonLine className="h-4 w-72 max-w-full" />
        </div>

        <Panel className="space-y-5" delay={40}>
          <SkeletonLine className="h-12 w-full max-w-[420px] rounded-[var(--oneui-control-radius)]" />
          <div className="hidden grid-cols-[auto_1fr_112px_88px_120px_88px] items-center gap-4 border-b border-border pb-3 text-xs font-semibold uppercase tracking-wide text-text-secondary md:grid">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonLine key={index} className="h-3 w-full rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[var(--oneui-card-radius)] border border-border p-4 sm:grid-cols-[auto_1fr_112px_88px_120px_88px]"
              >
                <SkeletonLine className="h-12 w-12 rounded-[var(--oneui-control-radius)]" />
                <div className="space-y-2 py-1">
                  <SkeletonLine className="h-4 w-36" />
                  <SkeletonLine className="h-3 w-24" />
                </div>
                <SkeletonLine className="h-4 w-full rounded-full" />
                <SkeletonLine className="h-4 w-full rounded-full mx-auto" />
                <SkeletonLine className="h-4 w-full rounded-full" />
                <SkeletonLine className="h-4 w-24 rounded-full ml-auto" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="space-y-6 pb-10">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-52" />
          <SkeletonLine className="h-4 w-72 max-w-full" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Panel key={index} className="min-h-[118px]" delay={index * 30}>
              <div className="space-y-3">
                <SkeletonLine className="h-4 w-28" />
                <SkeletonLine className="h-8 w-40" />
                <SkeletonLine className="h-4 w-24" />
              </div>
            </Panel>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Panel key={index} className="h-64" delay={index * 35}>
              <div className="space-y-4">
                <SkeletonLine className="h-5 w-24" />
                <SkeletonLine className="h-4 w-40" />
                <SkeletonLine className="h-48 w-full rounded-[var(--oneui-card-radius)]" />
              </div>
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "settings") {
    return (
      <div className="space-y-6 pb-10">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-52" />
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>

        <Panel className="space-y-5" delay={40}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <SkeletonLine className="h-5 w-40" />
              <SkeletonLine className="h-4 w-56" />
            </div>
            <SkeletonLine className="h-10 w-28 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <SkeletonLine className="h-4 w-32" />
                <SkeletonLine className="h-12 w-full" />
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Panel key={index} className="space-y-4" delay={index * 30}>
              <SkeletonLine className="h-4 w-36" />
              <SkeletonLine className="h-4 w-48" />
              <SkeletonLine className="h-12 w-full" />
              <SkeletonLine className="h-12 w-full" />
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  if (variant === "ai") {
    return (
      <div className="space-y-6 pb-10">
        <div className="space-y-3">
          <SkeletonLine className="h-7 w-56" />
          <SkeletonLine className="h-4 w-72 max-w-full" />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Panel key={index} className="space-y-4" delay={index * 30}>
              <SkeletonLine className="h-4 w-36" />
              <SkeletonLine className="h-14 w-full" />
              <SkeletonLine className="h-4 w-24" />
            </Panel>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <Panel
        className="min-h-[176px] overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6"
        delay={0}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 space-y-3 text-center lg:text-left">
            <SkeletonLine className="mx-auto h-3 w-36 lg:mx-0" />
            <SkeletonLine className="mx-auto h-14 w-full max-w-[520px] lg:mx-0 lg:h-16" />
          </div>

          <div className="mx-auto grid w-full max-w-[480px] grid-cols-4 gap-2.5 lg:mx-0 lg:w-auto lg:min-w-[392px] lg:gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-col items-center justify-center gap-2 px-1 py-1.5"
              >
                <SkeletonLine
                  className="h-11 w-11 rounded-full sm:h-12 sm:w-12 lg:h-14 lg:w-14"
                  delay={index * 25}
                />
                <SkeletonLine className="h-3 w-14" delay={index * 30} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Panel key={index} className="min-h-[112px]" delay={80 + index * 35}>
            <div className="space-y-3">
              <SkeletonLine className="h-4 w-28" delay={index * 20} />
              <SkeletonLine
                className="h-7 w-40 max-w-full"
                delay={index * 25}
              />
              <SkeletonLine className="h-4 w-24" delay={index * 30} />
            </div>
          </Panel>
        ))}
      </div>

      <Panel className="min-h-[170px]" delay={220}>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="space-y-3 rounded-[var(--oneui-control-radius)] border border-border/70 p-3"
            >
              <SkeletonLine className="h-3 w-20" delay={index * 25} />
              <SkeletonLine className="h-5 w-28" delay={index * 30} />
              <SkeletonLine
                className="h-3 w-full max-w-[160px]"
                delay={index * 35}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <SkeletonLine className="h-3 w-52 max-w-full" />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        {Array.from({ length: 3 }).map((_, index) => (
          <Panel key={index} className="min-h-[220px]" delay={280 + index * 35}>
            <div className="space-y-4">
              <SkeletonLine className="h-4 w-32" />
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="h-28 w-full rounded-[var(--oneui-card-radius)]" />
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-stretch">
        {Array.from({ length: 3 }).map((_, index) => (
          <Panel key={index} className="min-h-[260px]" delay={400 + index * 40}>
            <div className="space-y-4">
              <SkeletonLine className="h-4 w-36" />
              <SkeletonLine className="h-3 w-28" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, rowIndex) => (
                  <SkeletonLine
                    key={rowIndex}
                    className="h-9 w-full rounded-[var(--oneui-control-radius)]"
                    delay={rowIndex * 25}
                  />
                ))}
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
