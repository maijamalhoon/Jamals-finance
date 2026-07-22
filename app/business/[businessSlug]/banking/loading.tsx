export default function BusinessBankingLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse space-y-7 motion-reduce:animate-none">
        <div className="h-10 w-44 rounded-[var(--radius-button)] bg-surface-secondary" />
        <div className="space-y-3">
          <div className="h-3 w-32 rounded-full bg-primary-soft" />
          <div className="h-9 w-72 max-w-full rounded-xl bg-surface-secondary" />
          <div className="h-4 w-full max-w-2xl rounded-full bg-surface-secondary" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          ))}
        </div>
        <div className="h-20 rounded-[var(--radius-card)] bg-surface" />
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-56 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          ))}
        </div>
      </div>
    </main>
  );
}
