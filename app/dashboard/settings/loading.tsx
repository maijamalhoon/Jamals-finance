export default function SettingsLoading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 space-y-2">
        <div className="h-7 w-28 finance-skeleton" />
        <div className="h-4 w-64 finance-skeleton" />
      </div>
      <div className="max-w-xl space-y-4">
        <div className="h-48 finance-skeleton" />
        <div className="h-64 finance-skeleton" />
        <div className="h-24 finance-skeleton" />
      </div>
    </div>
  );
}
