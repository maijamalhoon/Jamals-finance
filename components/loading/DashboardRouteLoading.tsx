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

function DashboardMetricSkeleton({ index }: { index: number }) {
  return (
    <SkeletonPanel
      className="dashboard-metric-card flex h-full min-h-[14.25rem] min-w-0 flex-col overflow-hidden p-4 sm:p-5"
      delay={index * 35}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <SkeletonLine className="h-3 w-20 sm:w-24" delay={index * 35} />
        <SkeletonLine
          className="mt-7 h-9 w-[78%] max-w-44 sm:h-10"
          delay={20 + index * 35}
        />
        <div className="relative mt-auto h-[4.75rem] overflow-hidden pt-5">
          <div className="absolute inset-x-0 bottom-3 h-px bg-border/50" />
          <SkeletonLine
            className="absolute bottom-7 left-[2%] h-1 w-[31%] origin-left -rotate-[8deg] rounded-full"
            delay={40 + index * 35}
          />
          <SkeletonLine
            className="absolute bottom-7 left-[31%] h-1 w-[28%] origin-left rotate-[7deg] rounded-full"
            delay={55 + index * 35}
          />
          <SkeletonLine
            className="absolute bottom-5 left-[57%] h-1 w-[39%] origin-left -rotate-[5deg] rounded-full"
            delay={70 + index * 35}
          />
        </div>
      </div>
    </SkeletonPanel>
  );
}

function DashboardPulseSkeleton({ index }: { index: number }) {
  return (
    <SkeletonPanel
      className="dashboard-pulse-tile min-h-[116px] p-4 sm:p-5"
      delay={index * 30}
    >
      <div className="flex items-center justify-between gap-3">
        <SkeletonLine className="h-3 w-24" delay={index * 30} />
        <SkeletonLine
          className="size-2.5 shrink-0 rounded-full"
          delay={15 + index * 30}
        />
      </div>
      <SkeletonLine
        className="mt-5 h-7 w-28 max-w-[70%]"
        delay={30 + index * 30}
      />
      <SkeletonLine
        className="mt-3 h-3 w-32 max-w-[84%]"
        delay={45 + index * 30}
      />
    </SkeletonPanel>
  );
}

function DashboardCardHeaderSkeleton({
  action = true,
  delay = 0,
}: {
  action?: boolean;
  delay?: number;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <SkeletonLine
          className="size-4 shrink-0 rounded-[5px]"
          delay={delay}
        />
        <SkeletonLine className="h-3 w-24" delay={delay + 15} />
      </div>
      {action ? (
        <SkeletonLine className="h-8 w-8 shrink-0 rounded-full" delay={delay + 30} />
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <SkeletonPanel className="dashboard-balance-hero overflow-hidden">
        <div className="dashboard-balance-layout">
          <div className="dashboard-balance-copy min-w-0">
            <SkeletonLine className="h-3 w-32 sm:w-36" />
            <SkeletonLine className="mt-4 h-11 w-full max-w-[26rem] sm:h-14 lg:h-16" delay={25} />
          </div>

          <div
            aria-hidden="true"
            className="dashboard-balance-actions pointer-events-none"
          >
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`dashboard-quick-action-${index}`}
                className="dashboard-quick-action"
              >
                <SkeletonLine
                  className="dashboard-quick-action-icon size-full rounded-[inherit]"
                  delay={50 + index * 30}
                />
              </div>
            ))}
          </div>
        </div>
      </SkeletonPanel>

      <section
        aria-label="Loading month-to-date financial metrics"
        className="grid w-full grid-cols-1 gap-4 min-[360px]:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <DashboardMetricSkeleton key={`dashboard-metric-${index}`} index={index} />
        ))}
      </section>

      <section
        aria-label="Loading today’s financial pulse"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {Array.from({ length: 4 }, (_, index) => (
          <DashboardPulseSkeleton key={`dashboard-pulse-${index}`} index={index} />
        ))}
      </section>

      <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        <SkeletonPanel className="dashboard-graph-card flex h-full min-h-[220px] flex-col overflow-hidden p-4 sm:p-5">
          <DashboardCardHeaderSkeleton action={false} />
          <SkeletonLine className="mt-5 h-9 w-36 max-w-[72%]" delay={25} />
          <SkeletonLine className="mt-3 h-5 w-40 max-w-[82%]" delay={45} />
          <div className="relative mt-auto h-[132px] overflow-hidden rounded-[var(--radius-control)]">
            <div className="absolute inset-x-0 bottom-3 h-px bg-border/60" />
            <SkeletonLine className="absolute bottom-9 left-[2%] h-1 w-[28%] origin-left -rotate-[8deg]" delay={60} />
            <SkeletonLine className="absolute bottom-9 left-[28%] h-1 w-[24%] origin-left rotate-[18deg]" delay={80} />
            <SkeletonLine className="absolute bottom-4 left-[49%] h-1 w-[28%] origin-left -rotate-[20deg]" delay={100} />
            <SkeletonLine className="absolute bottom-11 left-[74%] h-1 w-[24%] origin-left rotate-[8deg]" delay={120} />
          </div>
        </SkeletonPanel>

        <SkeletonPanel
          className="finance-reference-card flex h-full min-w-0 flex-col overflow-hidden p-4 sm:p-5 lg:p-6"
          delay={35}
        >
          <DashboardCardHeaderSkeleton delay={35} />
          <div className="mt-5 grid min-h-0 flex-1 gap-5 md:grid-cols-[minmax(220px,0.86fr)_minmax(280px,1.14fr)] md:items-center">
            <div className="min-w-0">
              <div className="relative mx-auto aspect-square w-full max-w-[240px] min-[420px]:max-w-[248px] sm:max-w-[256px] md:max-w-[272px] lg:max-w-[288px] xl:max-w-[300px] 2xl:max-w-[260px]">
                <SkeletonLine className="absolute inset-0 rounded-full" delay={65} />
                <div className="absolute inset-[22%] rounded-full bg-card" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="w-[42%] space-y-2">
                    <SkeletonLine className="mx-auto h-7 w-full" delay={85} />
                    <SkeletonLine className="mx-auto h-3 w-3/4" delay={100} />
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-2.5">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={`investment-loading-row-${index}`}
                  className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(76px,0.9fr)_auto] items-center gap-2.5 px-3 py-2.5 sm:grid-cols-[auto_minmax(110px,1fr)_minmax(110px,1.2fr)_auto] sm:gap-3 sm:px-4 sm:py-3 md:grid-cols-[auto_minmax(110px,1fr)_auto] md:gap-4"
                >
                  <SkeletonLine
                    className="size-[34px] shrink-0 rounded-full"
                    delay={90 + index * 25}
                  />
                  <div className="min-w-0 space-y-1.5 md:hidden">
                    <SkeletonLine className="h-3 w-full" delay={100 + index * 25} />
                    <SkeletonLine className="h-2.5 w-1/2" delay={110 + index * 25} />
                  </div>
                  <SkeletonLine className="h-[3px] min-w-[76px]" delay={120 + index * 25} />
                  <SkeletonLine className="h-3 w-10 md:w-20" delay={130 + index * 25} />
                </div>
              ))}
            </div>
          </div>
        </SkeletonPanel>

        <SkeletonPanel
          className="finance-reference-card flex h-full min-h-[286px] min-w-0 flex-col overflow-hidden p-3.5 sm:min-h-[300px] sm:p-5"
          delay={70}
        >
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <SkeletonLine className="h-3 w-36" delay={70} />
              <SkeletonLine className="h-5 w-48 max-w-full" delay={85} />
            </div>
            <div className="flex shrink-0 gap-2">
              <SkeletonLine className="h-8 w-10 rounded-[8px] sm:h-9 sm:w-11" delay={100} />
              <SkeletonLine className="h-8 w-10 rounded-[8px] sm:h-9 sm:w-11" delay={115} />
            </div>
          </div>
          <div className="relative mt-5 min-h-[180px] flex-1 overflow-hidden rounded-[var(--radius-control)] border border-border/70 p-3 sm:min-h-[196px] sm:p-4">
            <div className="absolute inset-4 grid grid-rows-4">
              {Array.from({ length: 4 }, (_, index) => (
                <span key={`cashflow-grid-${index}`} className="border-t border-border/55" />
              ))}
            </div>
            <SkeletonLine className="absolute bottom-[34%] left-[5%] h-1 w-[23%] origin-left -rotate-[7deg]" delay={130} />
            <SkeletonLine className="absolute bottom-[39%] left-[27%] h-1 w-[24%] origin-left rotate-[9deg]" delay={150} />
            <SkeletonLine className="absolute bottom-[28%] left-[50%] h-1 w-[23%] origin-left -rotate-[12deg]" delay={170} />
            <SkeletonLine className="absolute bottom-[39%] left-[72%] h-1 w-[23%] origin-left rotate-[5deg]" delay={190} />
            <SkeletonLine className="absolute bottom-[55%] left-[5%] h-1 w-[22%] origin-left rotate-[10deg] opacity-75" delay={145} />
            <SkeletonLine className="absolute bottom-[44%] left-[26%] h-1 w-[24%] origin-left -rotate-[7deg] opacity-75" delay={165} />
            <SkeletonLine className="absolute bottom-[52%] left-[49%] h-1 w-[24%] origin-left rotate-[8deg] opacity-75" delay={185} />
            <SkeletonLine className="absolute bottom-[42%] left-[72%] h-1 w-[23%] origin-left -rotate-[9deg] opacity-75" delay={205} />
          </div>
        </SkeletonPanel>
      </div>

      <div className="grid w-full grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
        <SkeletonPanel className="finance-reference-card flex h-full min-h-[320px] min-w-0 flex-col overflow-hidden p-4 sm:p-5">
          <DashboardCardHeaderSkeleton />
          <div className="mt-7 flex min-h-0 flex-1 items-center gap-5">
            <div className="relative size-32 shrink-0 sm:size-36">
              <SkeletonLine className="absolute inset-0 rounded-full" delay={35} />
              <div className="absolute inset-[25%] rounded-full bg-card" />
            </div>
            <div className="min-w-0 flex-1 space-y-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`spending-legend-${index}`} className="flex items-center gap-2.5">
                  <SkeletonLine className="size-2.5 shrink-0 rounded-full" delay={60 + index * 25} />
                  <SkeletonLine className="h-3 flex-1" delay={70 + index * 25} />
                  <SkeletonLine className="h-3 w-10" delay={80 + index * 25} />
                </div>
              ))}
            </div>
          </div>
        </SkeletonPanel>

        <SkeletonPanel
          className="finance-reference-card flex h-full min-h-[320px] min-w-0 flex-col overflow-hidden p-4 sm:p-5"
          delay={35}
        >
          <DashboardCardHeaderSkeleton delay={35} />
          <div className="mt-6 space-y-5">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={`goal-loading-row-${index}`} className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <SkeletonLine className="size-8 shrink-0 rounded-full" delay={60 + index * 25} />
                  <SkeletonLine className="h-3 flex-1" delay={70 + index * 25} />
                  <SkeletonLine className="h-3 w-12" delay={80 + index * 25} />
                </div>
                <SkeletonLine className="h-2 w-full" delay={90 + index * 25} />
              </div>
            ))}
          </div>
        </SkeletonPanel>

        <SkeletonPanel
          className="finance-reference-card flex h-full min-h-[320px] min-w-0 flex-col overflow-hidden p-4 sm:p-5"
          delay={70}
        >
          <DashboardCardHeaderSkeleton delay={70} />
          <div className="mt-5 space-y-2.5">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={`recent-transaction-loading-row-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2"
              >
                <SkeletonLine className="size-9 shrink-0 rounded-full" delay={90 + index * 25} />
                <div className="min-w-0 space-y-2">
                  <SkeletonLine className="h-3 w-3/4" delay={100 + index * 25} />
                  <SkeletonLine className="h-2.5 w-1/2" delay={110 + index * 25} />
                </div>
                <SkeletonLine className="h-4 w-16" delay={120 + index * 25} />
              </div>
            ))}
          </div>
        </SkeletonPanel>
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
    <LoadingRegion
      label={label}
      className={
        variant === "dashboard"
          ? "dashboard-overview w-full space-y-6 pb-12"
          : "space-y-5 pb-10 sm:space-y-6"
      }
    >
      {content}
    </LoadingRegion>
  );
}
