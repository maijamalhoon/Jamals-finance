export default function BusinessDocumentsLoading() {
  return (
    <main className="min-h-dvh bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl animate-pulse">
        <div className="h-10 w-44 rounded-[var(--radius-button)] bg-surface-secondary" />
        <div className="mt-8 h-8 w-72 rounded bg-surface-secondary" />
        <div className="mt-3 h-5 w-full max-w-2xl rounded bg-surface-secondary" />
        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-[var(--radius-card)] bg-surface" />)}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-64 rounded-[var(--radius-card)] bg-surface" />)}
        </div>
      </div>
    </main>
  );
}
