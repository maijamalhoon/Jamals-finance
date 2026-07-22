export default function BusinessTaxClosingLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="h-5 w-36 rounded bg-surface-secondary" />
        <div className="mt-6 h-9 w-72 max-w-full rounded bg-surface-secondary" />
        <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-32 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          ))}
        </div>
        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <div className="h-96 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
          <div className="h-96 rounded-[var(--radius-card)] bg-surface shadow-[var(--shadow-sm)]" />
        </div>
      </div>
    </main>
  );
}
