import type { LucideIcon } from "lucide-react";

interface BottomInsightCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}

export default function BottomInsightCard({
  label,
  value,
  detail,
  icon: Icon,
}: BottomInsightCardProps) {
  return (
    <article className="finance-reference-card card-hover h-full p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-text-secondary">
            {label}
          </p>
          <p className="mt-2 truncate text-lg font-bold text-text-primary">
            {value}
          </p>
        </div>
        <div className="finance-icon-bubble h-10 w-10">
          <Icon size={17} strokeWidth={2.1} />
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-text-secondary">{detail}</p>
    </article>
  );
}
