export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-28 bg-gray-800 rounded-xl" />
        <div className="h-4 w-64 bg-gray-800 rounded" />
      </div>
      <div className="max-w-xl space-y-4">
        <div className="h-48 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
        <div className="h-64 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
        <div className="h-24 bg-gray-900/60 border border-gray-800/50 rounded-2xl" />
      </div>
    </div>
  );
}
