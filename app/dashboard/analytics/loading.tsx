import { Skeleton } from "@/components/ui/skeleton";
import { getServerAnimationMode } from "@/lib/animation-preference-server";

const RANGE_CONTROLS = ["today", "week", "month", "six-month", "year", "custom"];
const KPI_CARDS = ["income", "expenses", "savings", "rate"];
const CONTEXT_ITEMS = ["days", "income-count", "expense-count", "daily-income", "daily-spending"];
const SOURCE_ROWS = ["source-one", "source-two", "source-three"];
const ENTRY_PANELS = ["expenses", "income"];

function PanelHeading({ width = "w-44" }: { width?: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <Skeleton className="h-3 w-24 max-w-full rounded-full" />
      <Skeleton className={`h-5 max-w-full rounded-full ${width}`} />
      <Skeleton className="h-3 w-full max-w-xl rounded-full" />
    </div>
  );
}

export default async function AnalyticsLoading() {
  const animationMode = await getServerAnimationMode();

  if (animationMode === "none") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading analytics"
        data-no-animation-route-loading="true"
        className="min-h-8 pb-4"
      >
        <span className="text-xs font-semibold text-text-secondary">Loading</span>
      </div>
    );
  }

  if (animationMode === "fast") {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Loading analytics"
        data-fast-animation-route-loading="true"
        className="min-h-8 pb-4"
      >
        <span className="jf-fast-route-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="sr-only">Loading analytics</span>
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true" aria-label="Loading analytics" className="min-w-0 pb-8">
      <span className="sr-only">Loading analytics</span>

      <div aria-hidden="true" className="min-w-0 space-y-4 sm:space-y-5">
        <header className="page-heading min-w-0 overflow-hidden">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="min-w-0 space-y-3">
              <Skeleton className="h-8 w-44 max-w-full rounded-full" />
              <Skeleton className="h-4 w-full max-w-xl rounded-full" />
              <Skeleton className="h-8 w-52 max-w-full rounded-full" />
            </div>

            <div className="grid min-w-0 grid-cols-3 gap-1 rounded-[var(--radius-control)] border border-border bg-card p-1 sm:flex sm:w-fit sm:flex-wrap">
              {RANGE_CONTROLS.map((control) => (
                <Skeleton key={control} className="h-11 min-w-0 rounded-[calc(var(--radius-control)-4px)] sm:w-[4.5rem]" />
              ))}
            </div>
          </div>
        </header>

        <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <div key={card} className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="size-10 shrink-0 rounded-[var(--radius-control)]" />
                <Skeleton className="h-7 w-20 max-w-[45%] rounded-full" />
              </div>
              <Skeleton className="mt-4 h-3 w-24 max-w-full rounded-full" />
              <Skeleton className="mt-2 h-8 w-36 max-w-full rounded-full" />
            </div>
          ))}
        </section>

        <section className="finance-panel-soft min-w-0 p-4 sm:p-5">
          <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] xl:items-center">
            <PanelHeading width="w-32" />
            <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {CONTEXT_ITEMS.map((item) => (
                <div key={item} className="min-w-0 space-y-2">
                  <Skeleton className="h-3 w-20 max-w-full rounded-full" />
                  <Skeleton className="h-5 w-24 max-w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 xl:grid-cols-2">
          {["income-expenses", "cumulative-flow"].map((chart) => (
            <div key={chart} className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
              <PanelHeading />
              <Skeleton className="mt-4 h-72 w-full rounded-[var(--radius-control)]" />
            </div>
          ))}
        </section>

        <section className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
          <PanelHeading width="w-40" />
          <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-3">
            {SOURCE_ROWS.map((row) => (
              <div key={row} className="finance-panel-soft min-w-0 p-3">
                <Skeleton className="h-4 w-32 max-w-full rounded-full" />
                <Skeleton className="mt-3 h-7 w-28 max-w-full rounded-full" />
                <Skeleton className="mt-3 h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        <section className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
          <PanelHeading width="w-48" />
          <div className="mt-5 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
            <div className="min-w-0">
              <Skeleton className="h-4 w-36 max-w-full rounded-full" />
              <Skeleton className="mt-3 h-64 w-full rounded-[var(--radius-control)]" />
            </div>
            <div className="min-w-0">
              <Skeleton className="h-4 w-36 max-w-full rounded-full" />
              <div className="mt-3 space-y-3">
                {SOURCE_ROWS.map((row) => (
                  <Skeleton key={row} className="h-16 w-full rounded-[var(--radius-control)]" />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="min-w-0">
          <PanelHeading width="w-36" />
          <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-2">
            {ENTRY_PANELS.map((panel) => (
              <div key={panel} className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
                <Skeleton className="h-5 w-36 max-w-full rounded-full" />
                <div className="mt-4 space-y-3">
                  {SOURCE_ROWS.map((row) => (
                    <Skeleton key={row} className="h-14 w-full rounded-[var(--radius-control)]" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="finance-panel min-w-0 overflow-hidden p-4 sm:p-5">
          <PanelHeading width="w-52" />
          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-3">
            {KPI_CARDS.slice(0, 3).map((card) => (
              <div key={card} className="finance-panel-soft min-w-0 p-4">
                <Skeleton className="h-3 w-24 max-w-full rounded-full" />
                <Skeleton className="mt-2 h-7 w-36 max-w-full rounded-full" />
              </div>
            ))}
          </div>
          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {["holding-one", "holding-two", "holding-three", "holding-four", "holding-five"].map((holding) => (
              <Skeleton key={holding} className="h-24 w-full rounded-[var(--radius-control)]" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}