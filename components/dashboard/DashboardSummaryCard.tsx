import type { LucideIcon } from "lucide-react";
import CountedAmount from "@/components/motion/CountedAmount";
import { cn } from "@/lib/utils";

type SummaryTone = "success" | "danger" | "info" | "warning";

const toneClasses: Record<
  SummaryTone,
  {
    bar: string;
    value: string;
  }
> = {
  success: {
    bar: "bg-success",
    value: "text-success",
  },
  danger: {
    bar: "bg-danger",
    value: "text-danger",
  },
  info: {
    bar: "bg-info",
    value: "text-info",
  },
  warning: {
    bar: "bg-warning",
    value: "text-warning",
  },
};

interface DashboardSummaryCardProps {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone: SummaryTone;
}

export default function DashboardSummaryCard({
  title,
  value,
  detail,
  icon: Icon,
  tone,
}: DashboardSummaryCardProps) {
  const toneClass = toneClasses[tone];

  return (
    <article className="finance-surface finance-hover-lift motion-card-entry relative flex h-full min-h-[132px] flex-col justify-between overflow-hidden p-4 sm:p-5">
      <div
        aria-hidden
        className={cn("absolute inset-x-5 top-0 h-px opacity-70", toneClass.bar)}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-text-secondary">{title}</p>
          <p
            className={cn(
              "mt-2 break-words text-xl font-bold leading-tight tracking-normal sm:text-2xl",
              toneClass.value,
            )}
          >
            <CountedAmount amount={value} />
          </p>
        </div>
        <div
          className="finance-icon-container"
          data-size="sm"
          data-tone={tone}
          aria-hidden
        >
          <Icon size={16} strokeWidth={2.15} />
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-text-secondary">{detail}</p>
    </article>
  );
}
