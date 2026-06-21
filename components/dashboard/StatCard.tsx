import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";

interface StatCardProps {
  title: string;
  amount: string;
  change: number;
  icon: LucideIcon;
  accentColor: string;
  progress: number;
}

export default function StatCard({
  title,
  amount,
  change,
  icon: Icon,
  accentColor,
  progress,
}: StatCardProps) {
  const positive = change >= 0;
  const lineWidth = Math.min(100, Math.max(6, progress));

  return (
    <div className="finance-panel card-hover relative flex min-h-[126px] flex-col justify-between overflow-hidden px-5 pb-5 pt-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[16px] border-0 shadow-none [&>svg]:stroke-current"
          style={{
            backgroundColor: `${accentColor}14`,
            color: accentColor,
          }}
        >
          <Icon size={16} />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {positive ? "+" : "-"}
          {Math.abs(change)}%
        </span>
      </div>

      <div className="pt-3">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="mt-1.5 break-words text-xl font-bold leading-tight tracking-normal text-slate-950">
          <CountedAmount amount={amount} />
        </p>
      </div>

      <div
        className="absolute inset-x-5 bottom-0 h-[3px] rounded-t-full"
        style={{ backgroundColor: `${accentColor}24` }}
      />
      <div
        className="motion-progress-fill absolute bottom-0 left-5 h-[3px] rounded-t-full transition-all duration-500"
        style={{ width: `calc((100% - 2.5rem) * ${lineWidth / 100})`, backgroundColor: accentColor }}
      />
    </div>
  );
}
