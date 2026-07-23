export default function BusinessFxLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-7xl space-y-5" aria-busy="true" aria-label="Loading foreign exchange workspace">
        <div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-surface" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-[var(--radius-card)] bg-surface" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />
          <div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-surface" />
        </div>
      </div>
    </main>
  );
}
