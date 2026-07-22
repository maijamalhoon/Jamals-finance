export default function BusinessInvitationAcceptanceLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-8 text-foreground sm:px-6">
      <section className="w-full max-w-lg animate-pulse rounded-[var(--radius-card)] bg-surface px-5 py-7 text-center shadow-[var(--shadow-sm)] sm:px-8 sm:py-9">
        <div className="mx-auto size-14 rounded-[var(--radius-button)] bg-primary-soft" />
        <div className="mx-auto mt-5 h-3 w-40 rounded bg-surface-secondary" />
        <div className="mx-auto mt-3 h-8 w-64 max-w-full rounded bg-surface-secondary" />
        <div className="mx-auto mt-4 h-4 w-full max-w-sm rounded bg-surface-secondary" />
        <div className="mx-auto mt-2 h-4 w-4/5 max-w-xs rounded bg-surface-secondary" />
      </section>
    </main>
  );
}
