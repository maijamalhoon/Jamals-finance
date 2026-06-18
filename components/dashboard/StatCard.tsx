import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  amount: string;
  usd: string;
  change: number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
}

export default function StatCard({
  title,
  amount,
  usd,
  change,
  icon: Icon,
  iconColor,
  iconBg,
}: StatCardProps) {
  const positive = change >= 0;

  return (
    <div className="finance-panel card-hover flex min-h-[132px] flex-col justify-between gap-4 p-4 hover:border-white/[0.14]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-slate-400 text-xs font-medium">{title}</span>
        <div
          className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center ring-1 ring-white/[0.06]`}
        >
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <div>
        <p className="break-words text-lg font-semibold leading-tight tracking-normal text-white">
          {amount}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-slate-500 text-[11px]">approx. {usd}</span>
          <span
            className={`flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${positive ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"}`}
          >
            {positive ?
              <ArrowUpRight size={11} />
            : <ArrowDownRight size={11} />}
            {Math.abs(change)}%
          </span>
        </div>
      </div>
    </div>
  );
}
