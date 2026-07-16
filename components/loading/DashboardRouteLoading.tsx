import {
  CardGridSkeleton,
  ChartSkeleton,
  FormSkeleton,
  LoadingRegion,
  MetricGridSkeleton,
  PageHeadingSkeleton,
  SkeletonLine,
  SkeletonPanel,
  TransactionListSkeleton,
} from "@/components/loading/LoadingPrimitives";

type DashboardRouteLoadingVariant =
  | "dashboard"
  | "accounts"
  | "transactions"
  | "income"
  | "expenses"
  | "goals"
  | "payables"
  | "investments"
  | "analytics"
  | "settings"
  | "ai";

function DashboardSkeleton() {
  return (
    <>
      <SkeletonPanel className="min-h-[176px] overflow-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <SkeletonLine className="h-3 w-36" />
            <SkeletonLine className="h-14 w-full max-w-[520px] lg:h-16" />
            <SkeletonLine className="h-4 w-full max-w-[420px]" />
          </div>

          <div className="mx-auto grid w-full max-w-[480px] grid-cols-4 gap-2.5 lg:mx-0 lg:w-auto lg:min-w-[392px] lg:gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`quick-action-${index}`} className="flex min-w-0 flex-col items-center justify-center gap-2 px-1 py-1.5">
                <SkeletonLine className="size-11 rounded-[16px] sm:size-12" delay={index * 25} />
                <SkeletonLine className="h-3 w-14" delay={index * 30} />
              </div>
            ))}
          </div>
        </div>
      </SkeletonPanel>

      <MetricGridSkeleton count={4} />

      <div className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <SkeletonPanel className="min-h-[220px]">
          <SkeletonLine className="h-4 w-32" />
          <SkeletonLine className="mt-3 h-3 w-24" />
          <SkeletonLine className="mt-5 h-28 rounded-[var(--radius-card)]" />
        </SkeletonPanel>
        <SkeletonPanel className="min-h-[220px]" delay={35}>
          <SkeletonLine className="h-4 w-36" />
          <SkeletonLine className="mt-3 h-3 w-28" />
          <SkeletonLine className="mt-5 h-28 rounded-[var(--radius-card)]" />
        </SkeletonPanel>
        <ChartSkeleton className="min-h-[220px] [&>div:last-child]:h-40" />
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonPanel key={`dashboard-list-${index}`} className="min-h-[260px]" delay={index * 35}>
            <SkeletonLine className="h-4 w-36" />
            <SkeletonLine className="mt-2 h-3 w-28" />
            <div className="mt-5 space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <SkeletonLine key={`dashboard-list-${index}-${row}`} className="h-10 rounded-[var(--radius-control)]" delay={row * 20} />
              ))}
            </div>
          </SkeletonPanel>
        ))}
      </div>
    </>
  );
}

function AccountsSkeleton() {
  return (
    <>
      <PageHeadingSkeleton summaries={2} />
      <CardGridSkeleton count={4} minHeight="min-h-[320px]" />
    </>
  );
}

function LedgerSkeleton() {
  return (
    <>
      <PageHeadingSkeleton />
      <MetricGridSkeleton count={3} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <SkeletonPanel className="min-h-[240px]">
          <SkeletonLine className="h-5 w-40" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonLine key={`breakdown-${index}`} className="h-9 rounded-[var(--radius-control)]" delay={index * 20} />
            ))}
          </div>
        </SkeletonPanel>
        <TransactionListSkeleton rows={5} />
      </div>
    </>
  );
}

function GoalsSkeleton() {
  return (
    <>
      <PageHeadingSkeleton />
      <MetricGridSkeleton count={4} />
      <CardGridSkeleton count={4} minHeight="min-h-[270px]" />
    </>
  );
}

function PayablesSkeleton() {
  return (
    <>
      <PageHeadingSkeleton />
      <MetricGridSkeleton count={3} />
      <SkeletonPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SkeletonLine className="h-11 w-full rounded-[var(--radius-control)] sm:max-w-md" />
        <SkeletonLine className="h-11 w-full rounded-[var(--radius-control)] sm:max-w-sm" />
      </SkeletonPanel>
      <div className="space-y-4">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonPanel key={`payable-${index}`} className="min-h-[250px]" delay={index * 35}>
            <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.55fr)]">
              <div className="space-y-3">
                <SkeletonLine className="h-6 w-24" />
                <SkeletonLine className="h-7 w-52 max-w-full" />
                <SkeletonLine className="h-4 w-full max-w-lg" />
                <SkeletonLine className="h-16 rounded-[var(--radius-control)]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <SkeletonLine className="h-20 rounded-[var(--radius-control)]" />
                <SkeletonLine className="h-20 rounded-[var(--radius-control)]" />
                <SkeletonLine className="col-span-2 h-16 rounded-[var(--radius-control)]" />
              </div>
            </div>
          </SkeletonPanel>
        ))}
      </div>
    </>
  );
}

function InvestmentsSkeleton() {
  return (
    <>
      <PageHeadingSkeleton />
      <SkeletonPanel className="min-h-[240px] overflow-hidden">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-3">
            <SkeletonLine className="h-3 w-28" />
            <SkeletonLine className="h-12 w-64 max-w-full" />
            <SkeletonLine className="h-6 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <SkeletonLine key={`portfolio-metric-${index}`} className="h-20 rounded-[var(--radius-control)]" delay={index * 20} />
            ))}
          </div>
        </div>
      </SkeletonPanel>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(18rem,0.65fr)_minmax(0,1.35fr)]">
        <ChartSkeleton />
        <CardGridSkeleton count={3} minHeight="min-h-[340px]" />
      </div>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <PageHeadingSkeleton action={false} />
      <MetricGridSkeleton count={4} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <SkeletonPanel className="min-h-[220px]">
        <SkeletonLine className="h-5 w-48" />
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonLine key={`analytics-source-${index}`} className="h-28 rounded-[var(--radius-control)]" delay={index * 25} />
          ))}
        </div>
      </SkeletonPanel>
    </>
  );
}

function SettingsSkeleton() {
  return (
    <>
      <PageHeadingSkeleton action={false} />
      <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,0.38fr)_minmax(0,1fr)]">
        <SkeletonPanel className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonLine key={`settings-tab-${index}`} className="h-11 rounded-[var(--radius-control)]" delay={index * 20} />
          ))}
        </SkeletonPanel>
        <FormSkeleton fields={4} />
      </div>
    </>
  );
}

function AiSkeleton() {
  return (
    <>
      <PageHeadingSkeleton action={false} />
      <MetricGridSkeleton count={3} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <SkeletonPanel key={`ai-panel-${index}`} className="min-h-[300px]" delay={index * 35}>
            <SkeletonLine className="h-5 w-40" />
            <SkeletonLine className="mt-4 h-20 rounded-[var(--radius-control)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <SkeletonLine key={`ai-panel-${index}-${row}`} className="h-12 rounded-[var(--radius-control)]" delay={row * 20} />
              ))}
            </div>
          </SkeletonPanel>
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
  const content =
    variant === "accounts" ? <AccountsSkeleton />
    : variant === "transactions" ? (
      <>
        <PageHeadingSkeleton />
        <TransactionListSkeleton />
      </>
    )
    : variant === "income" || variant === "expenses" ? <LedgerSkeleton />
    : variant === "goals" ? <GoalsSkeleton />
    : variant === "payables" ? <PayablesSkeleton />
    : variant === "investments" ? <InvestmentsSkeleton />
    : variant === "analytics" ? <AnalyticsSkeleton />
    : variant === "settings" ? <SettingsSkeleton />
    : variant === "ai" ? <AiSkeleton />
    : <DashboardSkeleton />;

  const label =
    variant === "ai" ? "Loading AI insights"
    : variant === "analytics" ? "Loading analytics"
    : `Loading ${variant}`;

  return (
    <LoadingRegion label={label} className="space-y-5 pb-10 sm:space-y-6">
      {content}
    </LoadingRegion>
  );
}
