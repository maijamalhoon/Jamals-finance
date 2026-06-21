export default function TransactionsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 finance-skeleton" />
        <div className="h-4 w-32 finance-skeleton" />
      </div>
      <div className="space-y-3 mb-5">
        <div className="flex gap-3">
          <div className="h-10 w-48 finance-skeleton" />
          <div className="h-10 w-56 finance-skeleton" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-40 finance-skeleton" />
          <div className="h-9 w-40 finance-skeleton" />
        </div>
      </div>
      <div className="finance-skeleton p-5">
        <div className="h-8 finance-skeleton mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 finance-skeleton mb-2" />
        ))}
      </div>
    </div>
  );
}
