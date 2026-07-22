export default function BusinessNotificationsLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="flex items-center justify-between gap-4">
          <div className="h-10 w-44 rounded-[var(--radius-button)] bg-surface-secondary" />
          <div className="h-8 w-36 rounded-full bg-success-soft" />
        </div>
        <div className="mt-7 flex items-start gap-4">
          <div className="size-12 rounded-[var(--radius-button)] bg-primary-soft" />
          <div className="flex-1">
            <div className="h-3 w-28 rounded bg-surface-secondary" />
            <div className="mt-3 h-8 w-72 max-w-full rounded bg-surface-secondary" />
            <div className="mt-4 h-4 w-full max-w-2xl rounded bg-surface-secondary" />
          </div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-[var(--radius-card)] bg-surface" />
          ))}
        </div>
        <div className="mt-8 h-[30rem] rounded-[var(--radius-card)] bg-surface" />
      </div>
    </main>
  );
}
