export default function AIInsightsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-36 bg-gray-800 rounded-xl" />
        <div className="h-4 w-72 bg-gray-800 rounded" />
      </div>
      <div className="max-w-lg space-y-4">
        <div className="h-56 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
        <div className="h-72 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
      </div>
    </div>
  );
}
