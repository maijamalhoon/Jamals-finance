import type { ReactNode } from "react";

type DashboardRouteLoadingVariant =
  | "dashboard"
  | "analytics"
  | "table"
  | "cards"
  | "settings"
  | "ai";

const loadingLabels: Record<DashboardRouteLoadingVariant, string> = {
  dashboard: "Loading dashboard",
  analytics: "Loading analytics",
  table: "Loading records",
  cards: "Loading overview",
  settings: "Loading settings",
  ai: "Loading AI insights",
};

function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`finance-skeleton ${className}`} />;
}

function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div data-loading="true" className={`finance-loading-panel p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function PageHeading() {
  return (
    <div className="space-y-2.5">
      <Skeleton className="h-7 w-48 rounded-xl" />
      <Skeleton className="h-4 w-full max-w-sm rounded-lg" />
    </div>
  );
}

function MetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <Panel key={index} className="min-h-[122px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-3.5 w-24 rounded-lg" />
              <Skeleton className="h-8 w-36 max-w-full rounded-xl" />
              <Skeleton className="h-3.5 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
          </div>
        </Panel>
      ))}
    </div>
  );
}

function ChartSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Panel className={compact ? "min-h-[260px]" : "min-h-[340px]"}>
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-lg" />
          <Skeleton className="h-3.5 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
      <div className="mt-8 flex h-44 items-end gap-2 sm:h-52">
        {[42, 68, 54, 82, 62, 91, 72, 100].map((height, index) => (
          <Skeleton
            key={`${height}-${index}`}
            className="min-w-0 flex-1 rounded-t-xl rounded-b-md"
          />
        ))}
      </div>
    </Panel>
  );
}

function DashboardLoading() {
  return (
    <>
      <Panel className="min-h-[176px]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <Skeleton className="h-3.5 w-32 rounded-lg" />
            <Skeleton className="h-12 w-full max-w-lg rounded-2xl" />
            <Skeleton className="h-4 w-64 max-w-full rounded-lg" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="grid justify-items-center gap-2">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <Skeleton className="h-3 w-12 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <MetricGrid />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
        <ChartSkeleton />
        <Panel className="min-h-[340px]">
          <Skeleton className="h-4 w-36 rounded-lg" />
          <div className="mt-6 grid gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border border-border/70 p-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32 max-w-full rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-16 rounded-lg" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function TableLoading() {
  return (
    <>
      <PageHeading />
      <Panel>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-[42px] w-full max-w-sm rounded-[var(--jf-control-radius)]" />
          <Skeleton className="h-[42px] w-32 rounded-[var(--jf-control-radius)]" />
        </div>
        <div className="mt-5 grid gap-2.5">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/70 p-3 sm:grid-cols-[auto_minmax(0,1fr)_7rem_6rem]"
            >
              <Skeleton className="h-10 w-10 rounded-2xl" />
              <div className="min-w-0 space-y-2">
                <Skeleton className="h-3.5 w-40 max-w-full rounded-lg" />
                <Skeleton className="h-3 w-24 rounded-lg" />
              </div>
              <Skeleton className="hidden h-4 w-20 rounded-lg sm:block" />
              <Skeleton className="h-4 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function CardsLoading() {
  return (
    <>
      <PageHeading />
      <MetricGrid count={3} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Panel key={index} className="min-h-[244px]">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
            <div className="mt-8 space-y-3">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="h-8 w-40 max-w-full rounded-xl" />
              <Skeleton className="h-3.5 w-full rounded-lg" />
              <Skeleton className="h-3.5 w-4/5 rounded-lg" />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

function SettingsLoading() {
  return (
    <>
      <PageHeading />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Panel key={index} className="min-h-[320px]">
            <Skeleton className="h-5 w-40 rounded-lg" />
            <Skeleton className="mt-2 h-3.5 w-64 max-w-full rounded-lg" />
            <div className="mt-7 grid gap-5">
              {Array.from({ length: 3 }).map((__, fieldIndex) => (
                <div key={fieldIndex} className="space-y-2">
                  <Skeleton className="h-3.5 w-24 rounded-lg" />
                  <Skeleton className="h-[42px] w-full rounded-[var(--jf-control-radius)]" />
                </div>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

function AnalyticsLoading() {
  return (
    <>
      <PageHeading />
      <MetricGrid count={3} />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    </>
  );
}

function AiLoading() {
  return (
    <>
      <PageHeading />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Panel key={index} className="min-h-[210px]">
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-2xl" />
              <Skeleton className="h-4 w-32 rounded-lg" />
            </div>
            <div className="mt-6 space-y-3">
              <Skeleton className="h-4 w-full rounded-lg" />
              <Skeleton className="h-4 w-11/12 rounded-lg" />
              <Skeleton className="h-4 w-4/5 rounded-lg" />
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}

export default function DashboardRouteLoading({
  variant = "dashboard",
}: {
  variant?: DashboardRouteLoadingVariant;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="space-y-5 pb-10 sm:space-y-6"
    >
      <span className="sr-only">{loadingLabels[variant]}</span>
      {variant === "dashboard" ? <DashboardLoading /> : null}
      {variant === "analytics" ? <AnalyticsLoading /> : null}
      {variant === "table" ? <TableLoading /> : null}
      {variant === "cards" ? <CardsLoading /> : null}
      {variant === "settings" ? <SettingsLoading /> : null}
      {variant === "ai" ? <AiLoading /> : null}
    </div>
  );
}
