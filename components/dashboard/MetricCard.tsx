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
  const lineWidth = Math.min(100, Math.max(34, progress));
  const displayAmount = amount.replace(/^PKR\s+/, "PKR");

  return (
    <article className="card-hover relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-[18px] border border-[#dfe5ee] bg-white px-[18px] pb-[17px] pt-[18px] text-[#020817] shadow-[0_1px_2px_rgb(15_23_42/0.08),0_8px_18px_rgb(15_23_42/0.08)] dark:border-border dark:bg-card dark:text-text-primary">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-85"
        style={{
          background: `radial-gradient(circle at 82% 20%, color-mix(in srgb, ${accentColor}, transparent 88%), transparent 24%)`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div
          className="relative grid h-8 w-8 place-items-center rounded-full"
          style={{
            backgroundColor: `color-mix(in srgb, ${accentColor}, transparent 91%)`,
            color: accentColor,
          }}
        >
          <Icon size={16} strokeWidth={2.15} />
        </div>
        <span
          className="relative inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold leading-none"
          style={{
            backgroundColor: `color-mix(in srgb, ${positive ? "#22c55e" : "#ef4444"}, transparent 90%)`,
            color: positive ? "#22c55e" : "#ef4444",
          }}
        >
          {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {positive ? "+" : "-"}
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>

      <div className="relative pt-3">
        <p className="text-[11px] font-medium leading-none text-[#7f8798] dark:text-text-secondary">
          {title}
        </p>
        <p className="mt-1.5 break-words text-[20px] font-bold leading-none tracking-normal text-[#020817] dark:text-text-primary">
          <CountedAmount amount={displayAmount} />
        </p>
      </div>

      <div className="absolute bottom-0 left-[18px] h-[2px] rounded-full bg-transparent" style={{ width: "calc(100% - 36px)" }}>
        <div
          className="motion-progress-fill h-full rounded-full"
          style={{ width: `${lineWidth}%`, backgroundColor: accentColor }}
        />
      </div>
    </article>
  );
}
