function SkeletonCard() {
  return (
    <div className="min-h-36 animate-pulse rounded-[var(--radius-card)] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="h-3 w-24 rounded-full bg-surface-secondary" />
      <div className="mt-5 h-9 w-28 rounded-xl bg-surface-secondary" />
      <div className="mt-5 h-3 w-full rounded-full bg-surface-secondary" />
      <div className="mt-2 h-3 w-2/3 rounded-full bg-surface-secondary" />
    </div>
  );
}

export default function AdminLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[1500px] space-y-6 pb-12"
      aria-busy="true"
      aria-label="Loading JALVORO Admin Control Center"
    >
      <div className="animate-pulse rounded-[2rem] border border-border/70 bg-card/80 p-7 shadow-sm">
        <div className="h-6 w-44 rounded-full bg-surface-secondary" />
        <div className="mt-6 h-11 w-full max-w-2xl rounded-2xl bg-surface-secondary" />
        <div className="mt-4 h-4 w-full max-w-xl rounded-full bg-surface-secondary" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-[var(--radius-card)] border border-border/70 bg-card/80" />
        <div className="h-80 animate-pulse rounded-[var(--radius-card)] border border-border/70 bg-card/80" />
      </div>
    </div>
  );
}
