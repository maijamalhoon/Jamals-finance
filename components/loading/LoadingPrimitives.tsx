import type { CSSProperties, ReactNode } from "react";
import { RefreshCw } from "@/components/icons/jalvoro/compat";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type LoadingRegionProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export function LoadingRegion({
  label,
  children,
  className,
}: LoadingRegionProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      data-loading-region="true"
      className={cn("min-w-0", className)}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">{children}</div>
    </div>
  );
}

export function SkeletonLine({
  className,
  delay = 0,
  style,
}: {
  className?: string;
  delay?: number;
  style?: CSSProperties;
}) {
  return (
    <Skeleton
      className={cn("h-4 w-full rounded-full", className)}
      style={{
        "--skeleton-delay": `${delay}ms`,
        ...style,
      } as CSSProperties}
    />
  );
}

export function SkeletonPanel({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={cn("finance-loading-panel min-w-0", className)}
      style={{ "--skeleton-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function PageHeadingSkeleton({
  action = true,
  summaries = 0,
}: {
  action?: boolean;
  summaries?: number;
}) {
  return (
    <SkeletonPanel className="page-heading min-h-[128px] overflow-hidden">
      <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <SkeletonLine className="h-6 w-32" />
          <SkeletonLine className="h-9 w-52 max-w-full" delay={30} />
          <SkeletonLine className="h-4 w-full max-w-xl" delay={60} />
        </div>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
          {summaries > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: summaries }, (_, index) => (
                <SkeletonLine
                  key={`heading-summary-${index}`}
                  className="h-14 w-full min-w-28 rounded-[var(--radius-control)]"
                  delay={90 + index * 25}
                />
              ))}
            </div>
          ) : null}
          {action ? (
            <SkeletonLine className="h-11 w-full rounded-[var(--radius-button)] sm:w-36" delay={140} />
          ) : null}
        </div>
      </div>
    </SkeletonPanel>
  );
}

export function MetricGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonPanel key={`metric-${index}`} className="min-h-[118px]" delay={index * 30}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-3">
              <SkeletonLine className="h-3 w-24" />
              <SkeletonLine className="h-8 w-36 max-w-full" delay={20} />
              <SkeletonLine className="h-3 w-20" delay={40} />
            </div>
            <SkeletonLine className="size-10 shrink-0 rounded-[var(--radius-control)]" />
          </div>
        </SkeletonPanel>
      ))}
    </div>
  );
}

export function CardGridSkeleton({
  count = 4,
  minHeight = "min-h-[260px]",
}: {
  count?: number;
  minHeight?: string;
}) {
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonPanel key={`card-${index}`} className={minHeight} delay={index * 35}>
          <div className="flex h-full min-w-0 flex-col gap-4">
            <div className="flex items-start gap-3">
              <SkeletonLine className="size-11 shrink-0 rounded-[var(--radius-control)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <SkeletonLine className="h-4 w-3/4" />
                <SkeletonLine className="h-3 w-1/2" delay={20} />
              </div>
            </div>
            <SkeletonLine className="h-20 rounded-[var(--radius-control)]" delay={40} />
            <div className="grid grid-cols-2 gap-3">
              <SkeletonLine className="h-14 rounded-[var(--radius-control)]" delay={60} />
              <SkeletonLine className="h-14 rounded-[var(--radius-control)]" delay={80} />
            </div>
            <SkeletonLine className="mt-auto h-3 w-full" delay={100} />
          </div>
        </SkeletonPanel>
      ))}
    </div>
  );
}

export function TransactionListSkeleton({ rows = 6 }: { rows?: number }) {
  const rowKeys = Array.from({ length: rows }, (_, index) => `transaction-${index}`);

  return (
    <SkeletonPanel className="space-y-4">
      <SkeletonLine className="h-11 w-full max-w-[420px] rounded-[var(--radius-control)]" />

      <div className="space-y-3 md:hidden">
        {rowKeys.map((key, index) => (
          <div key={`mobile-${key}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--radius-tile)] border border-border p-3">
            <SkeletonLine className="size-11 rounded-[var(--radius-control)]" delay={index * 20} />
            <div className="min-w-0 space-y-2">
              <SkeletonLine className="h-4 w-3/4" delay={index * 20} />
              <SkeletonLine className="h-3 w-1/2" delay={index * 20} />
            </div>
            <SkeletonLine className="h-5 w-20" delay={index * 20} />
          </div>
        ))}
      </div>

      <div className="hidden min-w-0 overflow-hidden rounded-[var(--radius-tile)] border border-border md:block">
        <div className="grid grid-cols-[minmax(12rem,1.6fr)_minmax(8rem,1fr)_7rem_8rem_8rem] gap-4 border-b border-border bg-surface-secondary p-3">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonLine key={`column-${index}`} className="h-3" />
          ))}
        </div>
        {rowKeys.map((key, index) => (
          <div key={`desktop-${key}`} className="grid grid-cols-[minmax(12rem,1.6fr)_minmax(8rem,1fr)_7rem_8rem_8rem] items-center gap-4 border-b border-border p-4 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              <SkeletonLine className="size-10 shrink-0 rounded-[var(--radius-control)]" delay={index * 20} />
              <SkeletonLine className="h-4 w-32 max-w-full" delay={index * 20} />
            </div>
            <SkeletonLine className="h-4 w-full" delay={index * 20} />
            <SkeletonLine className="h-4 w-full" delay={index * 20} />
            <SkeletonLine className="h-4 w-full" delay={index * 20} />
            <SkeletonLine className="ml-auto h-5 w-20" delay={index * 20} />
          </div>
        ))}
      </div>
    </SkeletonPanel>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonPanel className={cn("min-h-[340px] overflow-hidden", className)}>
      <div className="space-y-2">
        <SkeletonLine className="h-3 w-24" />
        <SkeletonLine className="h-5 w-44" />
      </div>
      <div className="relative mt-5 h-64 overflow-hidden rounded-[var(--radius-control)] border border-border bg-surface-inset p-4">
        <div className="absolute inset-4 grid grid-rows-4 gap-0">
          {Array.from({ length: 4 }, (_, index) => (
            <span key={`grid-${index}`} className="border-t border-border/70" />
          ))}
        </div>
        <div className="absolute inset-x-5 bottom-5 flex h-40 items-end gap-3">
          {[42, 68, 52, 82, 61, 74].map((height, index) => (
            <SkeletonLine
              key={`bar-${height}-${index}`}
              className="flex-1 rounded-t-[8px] rounded-b-none"
              delay={index * 30}
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>
    </SkeletonPanel>
  );
}

export function FormSkeleton({ fields = 5 }: { fields?: number }) {
  return (
    <SkeletonPanel className="space-y-4">
      {Array.from({ length: fields }, (_, index) => (
        <div key={`field-${index}`} className="space-y-2">
          <SkeletonLine className="h-3 w-28" delay={index * 20} />
          <SkeletonLine className="h-11 rounded-[var(--radius-control)]" delay={index * 20} />
        </div>
      ))}
      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
        <SkeletonLine className="h-11 w-full rounded-[var(--radius-button)] sm:w-28" />
        <SkeletonLine className="h-11 w-full rounded-[var(--radius-button)] sm:w-36" />
      </div>
    </SkeletonPanel>
  );
}

export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="mt-4 space-y-4" aria-hidden="true">
      <div className="grid gap-2 sm:grid-cols-2">
        <SkeletonLine className="h-12 rounded-[var(--radius-control)]" />
        <SkeletonLine className="h-12 rounded-[var(--radius-control)]" delay={20} />
      </div>
      {Array.from({ length: fields }, (_, index) => (
        <div key={`auth-field-${index}`} className="space-y-2">
          <SkeletonLine className="h-3 w-24" delay={index * 25} />
          <SkeletonLine className="h-12 rounded-[var(--radius-control)]" delay={index * 25} />
          <SkeletonLine className="h-3 w-40 max-w-full" delay={index * 25} />
        </div>
      ))}
      <SkeletonLine className="h-12 rounded-[var(--radius-button)]" delay={80} />
    </div>
  );
}

export function ReceiptSkeleton() {
  return (
    <LoadingRegion label="Loading receipt" className="pb-8 print:hidden">
      <div className="mx-auto w-full max-w-3xl">
        <SkeletonPanel className="overflow-hidden p-0">
          <div className="border-b border-border p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3">
                <SkeletonLine className="h-6 w-40" />
                <SkeletonLine className="h-4 w-28" />
              </div>
              <SkeletonLine className="size-12 rounded-[var(--radius-control)]" />
            </div>
            <SkeletonLine className="mt-8 h-3 w-28" />
            <SkeletonLine className="mt-3 h-12 w-56 max-w-full" />
            <SkeletonLine className="mt-3 h-7 w-24" />
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7">
            {[
              "account",
              "category",
              "date",
              "time",
              "reference",
              "status",
            ].map((field, index) => (
              <div key={field} className="space-y-2 rounded-[var(--radius-control)] border border-border p-3">
                <SkeletonLine className="h-3 w-20" delay={index * 20} />
                <SkeletonLine className="h-5 w-3/4" delay={index * 20} />
              </div>
            ))}
            <SkeletonLine className="h-20 rounded-[var(--radius-control)] sm:col-span-2" />
          </div>

          <div className="flex flex-col gap-2 border-t border-border bg-surface-secondary p-5 sm:flex-row sm:justify-end sm:p-7">
            <SkeletonLine className="h-11 w-full rounded-[var(--radius-button)] sm:w-36" />
            <SkeletonLine className="h-11 w-full rounded-[var(--radius-button)] sm:w-40" />
          </div>
        </SkeletonPanel>
      </div>
    </LoadingRegion>
  );
}

export function BackgroundRefreshStatus({
  refreshing,
  label = "Refreshing data",
  className,
}: {
  refreshing: boolean;
  label?: string;
  className?: string;
}) {
  if (!refreshing) return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center gap-1.5 text-xs text-text-tertiary", className)}
    >
      <RefreshCw className="size-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </span>
  );
}
