export default function ExpensesLoading() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-28 bg-gray-800 rounded-xl" />
          <div className="h-4 w-32 bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-32 bg-gray-800 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-900/60 border border-gray-800/50 rounded-2xl"
          />
        ))}
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 mb-4">
        <div className="h-6 w-48 bg-gray-800 rounded mb-4" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-800/50 rounded-xl mb-3" />
        ))}
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-800/50 rounded-xl mb-2" />
        ))}
      </div>
    </div>
  );
}
