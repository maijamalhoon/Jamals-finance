export default function DashboardLoading() {
  return (
    <div className="space-y-5 pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="finance-skeleton h-3 w-36" />
          <div className="finance-skeleton h-7 w-64" />
          <div className="finance-skeleton h-3 w-80 max-w-full" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="finance-skeleton h-32" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="finance-skeleton h-28" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="finance-skeleton h-72 lg:col-span-2" />
        <div className="finance-skeleton h-72" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="finance-skeleton h-64 lg:col-span-3" />
        <div className="space-y-4">
          <div className="finance-skeleton h-36" />
          <div className="finance-skeleton h-48" />
          <div className="finance-skeleton h-32" />
        </div>
      </div>
    </div>
  );
}
