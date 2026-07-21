export default function BusinessLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse motion-reduce:animate-none">
        <div className="h-10 w-40 rounded-[var(--radius-button)] bg-surface-secondary" />

        <div className="mt-8 rounded-[var(--radius-card)] bg-surface px-5 py-6 shadow-[var(--shadow-sm)] sm:px-7 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-[var(--radius-button)] bg-primary-soft" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-32 rounded-full bg-primary-soft" />
              <div className="mt-3 h-8 w-full max-w-sm rounded-full bg-surface-secondary" />
              <div className="mt-3 h-4 w-44 rounded-full bg-surface-secondary" />
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-20 rounded-[var(--radius-button)] bg-surface-secondary"
              />
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-52 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
