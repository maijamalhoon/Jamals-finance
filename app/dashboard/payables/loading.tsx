export default function LoadingPayables() {
  return (
    <div className="space-y-5">
      <div className="finance-skeleton h-28" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="finance-skeleton h-28" />
        <div className="finance-skeleton h-28" />
        <div className="finance-skeleton h-28" />
      </div>
      <div className="finance-skeleton h-20" />
      <div className="finance-skeleton h-80" />
    </div>
  );
}
