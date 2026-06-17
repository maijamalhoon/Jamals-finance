export default function DashboardLoading() {
  return (
    <div className="space-y-5 pb-4 animate-pulse">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-3 w-36 bg-gray-800 rounded" />
          <div className="h-7 w-64 bg-gray-800 rounded-xl" />
          <div className="h-3 w-80 bg-gray-800 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-32 bg-gray-900/60 border border-gray-800/50 rounded-2xl"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-72 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
        <div className="h-72 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-64 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
        <div className="space-y-4">
          <div className="h-36 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
          <div className="h-48 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
          <div className="h-32 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
