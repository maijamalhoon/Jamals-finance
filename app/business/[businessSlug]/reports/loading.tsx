export default function BusinessReportsLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="flex items-center justify-between gap-3">
          <div className="h-10 w-44 rounded-[var(--radius-button)] bg-surface-secondary" />
          <div className="h-8 w-52 rounded-full bg-success-soft" />
        </div>
        <div className="mt-7 h-4 w-36 rounded bg-primary-soft" />
        <div className="mt-3 h-9 w-80 max-w-full rounded bg-surface-secondary" />
        <div className="mt-3 h-5 w-[38rem] max-w-full rounded bg-surface-secondary" />
        <div className="mt-6 grid gap-4 rounded-[var(--radius-card)] bg-surface px-5 py-5 shadow-[var(--shadow-sm)] md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-11 rounded-[var(--radius-button)] bg-surface-secondary" />
          ))}
        </div>
        <div className="mt-6 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-10 w-32 shrink-0 rounded-full bg-surface-secondary" />
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          ))}
        </div>
        <div className="mt-6 h-80 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
      </div>
    </main>
  );
}
