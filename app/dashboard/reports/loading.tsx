export default function ReportsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-28 finance-skeleton" />
          <div className="h-4 w-36 finance-skeleton" />
        </div>
        <div className="h-10 w-32 finance-skeleton" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-20 finance-skeleton"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="h-72 finance-skeleton" />
        <div className="h-72 finance-skeleton" />
      </div>
      <div className="h-36 finance-skeleton" />
    </div>
  );
}
