export default function GoalsLoading() {
  return (
    <div className="animate-pulse space-y-4 sm:space-y-5">
      <div className="finance-reference-card flex items-center justify-between p-4 sm:p-5">
        <div className="space-y-2">
          <div className="h-4 w-36 finance-skeleton" />
          <div className="h-8 w-48 finance-skeleton" />
          <div className="h-4 w-32 finance-skeleton" />
        </div>
        <div className="h-10 w-28 finance-skeleton" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[118px] finance-skeleton"
          />
        ))}
      </div>
      <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[270px] finance-skeleton"
          />
        ))}
      </div>
    </div>
  );
}
