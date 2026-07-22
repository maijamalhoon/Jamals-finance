export default function BusinessTeamLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 text-foreground sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="h-10 w-48 rounded-[var(--radius-button)] bg-surface-secondary" />
        <div className="mt-8 h-4 w-40 rounded bg-surface-secondary" />
        <div className="mt-3 h-9 w-72 max-w-full rounded bg-surface-secondary" />
        <div className="mt-4 h-5 w-full max-w-2xl rounded bg-surface-secondary" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[var(--radius-card)] bg-surface" />
          ))}
        </div>
        <div className="mt-8 h-80 rounded-[var(--radius-card)] bg-surface" />
        <div className="mt-8 grid gap-4 xl:grid-cols-2">
          <div className="h-72 rounded-[var(--radius-card)] bg-surface" />
          <div className="h-72 rounded-[var(--radius-card)] bg-surface" />
        </div>
      </div>
    </main>
  );
}
