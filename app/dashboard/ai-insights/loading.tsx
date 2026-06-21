export default function AIInsightsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-36 finance-skeleton" />
        <div className="h-4 w-72 finance-skeleton" />
      </div>
      <div className="max-w-lg space-y-4">
        <div className="h-56 finance-skeleton" />
        <div className="h-72 finance-skeleton" />
      </div>
    </div>
  );
}
