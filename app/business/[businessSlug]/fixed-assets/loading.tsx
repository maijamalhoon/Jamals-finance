export default function FixedAssetsLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse space-y-5">
        <div className="h-32 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.95fr]">
          <div className="h-[34rem] rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          <div className="h-[34rem] rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        </div>
      </div>
    </main>
  );
}
