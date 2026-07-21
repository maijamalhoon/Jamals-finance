import { BookOpenCheck, LoaderCircle, Scale } from "lucide-react";

export default function BusinessAccountingLoading() {
  return (
    <main
      className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex min-h-10 items-center gap-2 text-sm font-bold text-text-secondary">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Loading accounting workspace
        </div>

        <header className="mt-7">
          <div className="h-3 w-36 animate-pulse rounded-full bg-primary-soft motion-reduce:animate-none" />
          <div className="mt-3 h-9 w-full max-w-sm animate-pulse rounded-[var(--radius-button)] bg-surface-secondary motion-reduce:animate-none" />
          <div className="mt-4 h-5 w-full max-w-2xl animate-pulse rounded-full bg-surface-secondary motion-reduce:animate-none" />
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[BookOpenCheck, Scale, BookOpenCheck, Scale].map((Icon, index) => (
            <article
              key={index}
              className="rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)]"
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <div className="mt-4 h-3 w-24 animate-pulse rounded-full bg-surface-secondary motion-reduce:animate-none" />
              <div className="mt-3 h-7 w-20 animate-pulse rounded-full bg-surface-secondary motion-reduce:animate-none" />
            </article>
          ))}
        </section>

        <section className="mt-8 rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)]">
          <div className="h-6 w-48 animate-pulse rounded-full bg-surface-secondary motion-reduce:animate-none" />
          <div className="mt-6 space-y-3">
            {[1, 2, 3, 4].map((row) => (
              <div
                key={row}
                className="h-11 w-full animate-pulse rounded-[var(--radius-button)] bg-surface-secondary motion-reduce:animate-none"
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
