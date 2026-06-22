function RowSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="finance-loading-panel overflow-hidden p-0">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index}>
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
            <div className="finance-skeleton h-11 w-11 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="finance-skeleton h-4 w-36 max-w-full" />
              <div className="finance-skeleton h-3 w-56 max-w-full" />
            </div>
            <div className="finance-skeleton h-8 w-14 rounded-full" />
          </div>
          {index < rows - 1 && <div className="ml-[76px] h-px bg-border" />}
        </div>
      ))}
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 px-3 py-4 sm:px-5 lg:px-7">
      <div className="space-y-2 px-2">
        <div className="finance-skeleton h-8 w-36" />
        <div className="finance-skeleton h-4 w-72 max-w-full" />
      </div>

      <div className="space-y-2">
        <div className="finance-skeleton ml-2 h-3 w-24" />
        <div className="finance-loading-panel">
          <div className="flex items-center gap-4">
            <div className="finance-skeleton h-16 w-16 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="finance-skeleton h-6 w-44 max-w-full" />
              <div className="finance-skeleton h-4 w-64 max-w-full" />
            </div>
          </div>
        </div>
        <RowSkeleton rows={2} />
      </div>

      <div className="space-y-2">
        <div className="finance-skeleton ml-2 h-3 w-28" />
        <RowSkeleton rows={3} />
      </div>

      <div className="space-y-2">
        <div className="finance-skeleton ml-2 h-3 w-32" />
        <RowSkeleton rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="finance-loading-panel text-center">
            <div className="finance-skeleton mx-auto h-7 w-12" />
            <div className="finance-skeleton mx-auto mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
