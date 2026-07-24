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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-5 top-0 h-px opacity-80"
        style={{ backgroundColor: accentColor }}
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className="finance-icon-bubble h-9 w-9 [&>svg]:stroke-current"
          style={{
            backgroundColor: `${accentColor}14`,
            color: accentColor,
          }}
        >
          <Icon size={16} />
        </div>
        <span
          className={`finance-state-pill ${
            positive ? "finance-status-success" : "finance-status-danger"
          }`}
        >
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {positive ? "+" : "-"}
          {Math.abs(change)}%
        </span>
      </div>

      <div className="pt-3">
        <p className="text-xs font-medium text-text-secondary">{title}</p>
        <p className="mt-1.5 break-words text-xl font-bold leading-tight tracking-normal text-text-primary">
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
