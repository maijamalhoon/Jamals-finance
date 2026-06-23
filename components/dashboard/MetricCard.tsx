import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";

interface MetricCardProps {
  title: string;
  amount: string;
  change: number;
  icon: LucideIcon;
  accentColor: string;
  progress: number;
}

export default function MetricCard({
  title,
  amount,
  change,
  icon: Icon,
  accentColor,
  progress,
}: MetricCardProps) {
  const positive = change >= 0;
  const lineWidth = Math.min(100, Math.max(7, progress));

  return (
    <article className="finance-reference-card card-hover relative flex min-h-[142px] flex-col justify-between overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-[18px] border"
          style={{
            borderColor: `color-mix(in srgb, ${accentColor}, transparent 68%)`,
            backgroundColor: `color-mix(in srgb, ${accentColor}, transparent 90%)`,
            color: accentColor,
          }}
        >
          <Icon size={18} strokeWidth={2.2} />
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

      <div className="pt-5">
        <p className="text-xs font-semibold text-text-secondary">{title}</p>
        <p className="mt-2 break-words text-[1.45rem] font-bold leading-tight tracking-normal text-text-primary">
          <CountedAmount amount={amount} />
        </p>
      </div>

      <div className="absolute inset-x-5 bottom-4 h-1 overflow-hidden rounded-full bg-surface-secondary">
        <div
          className="motion-progress-fill h-full rounded-full"
          style={{ width: `${lineWidth}%`, backgroundColor: accentColor }}
        />
      </div>
    </article>
  );
}
