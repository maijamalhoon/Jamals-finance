export default function AccountsLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-36 finance-skeleton" />
          <div className="h-4 w-56 finance-skeleton" />
        </div>
        <div className="h-10 w-32 finance-skeleton" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-52 finance-skeleton"
          />
        ))}
      </div>
    </div>
  );
}
