export default function TransactionsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-48 bg-gray-800 rounded-xl" />
        <div className="h-4 w-32 bg-gray-800 rounded" />
      </div>
      <div className="space-y-3 mb-5">
        <div className="flex gap-3">
          <div className="h-10 w-48 bg-gray-800 rounded-xl" />
          <div className="h-10 w-56 bg-gray-800 rounded-xl" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-40 bg-gray-800 rounded-xl" />
          <div className="h-9 w-40 bg-gray-800 rounded-xl" />
        </div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5">
        <div className="h-8 bg-gray-800 rounded mb-4" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-800/50 rounded-xl mb-2" />
        ))}
      </div>
    </div>
  );
}
