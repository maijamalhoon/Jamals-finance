import { ReceiptText } from "@/components/icons/jalvoro/compat";

export default function BusinessSalesLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="h-10 w-48 rounded-[var(--radius-button)] bg-surface-secondary" />

        <div className="mt-7 flex items-start gap-3">
          <span className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <ReceiptText className="size-5" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <div className="h-3 w-40 rounded-full bg-surface-secondary" />
            <div className="mt-3 h-8 w-64 max-w-full rounded-full bg-surface-secondary" />
            <div className="mt-4 h-4 w-full max-w-2xl rounded-full bg-surface-secondary" />
          </div>
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-28 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]"
            />
          ))}
        </div>

        <div className="mt-8 h-[34rem] rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        <div className="mt-8 h-72 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        <div className="mt-8 h-80 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
      </div>
    </main>
  );
}
