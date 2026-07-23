import { Store } from "@/components/icons/jalvoro/compat";

export default function SimpleShopLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="h-10 w-48 rounded-[var(--radius-button)] bg-surface-secondary" />
        <header className="mt-7 flex items-start gap-4 rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)]">
          <span className="inline-flex size-12 items-center justify-center rounded-[var(--radius-button)] bg-primary-soft text-primary">
            <Store className="size-6" aria-hidden="true" />
          </span>
          <div className="flex-1">
            <div className="h-3 w-28 rounded-full bg-surface-secondary" />
            <div className="mt-3 h-8 w-72 max-w-full rounded-full bg-surface-secondary" />
            <div className="mt-3 h-4 w-44 rounded-full bg-surface-secondary" />
          </div>
        </header>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          ))}
        </div>
        <div className="mt-8 h-[34rem] rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        <div className="mt-8 grid gap-5 xl:grid-cols-2">
          <div className="h-96 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          <div className="h-96 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        </div>
      </div>
    </main>
  );
}
