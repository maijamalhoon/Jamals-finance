import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-7" : "py-14 sm:py-16"
      }`}
    >
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.045] text-slate-400 shadow-[0_12px_30px_rgba(0,0,0,0.18)]">
        <Icon size={18} />
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-600">
        {description}
      </p>
    </div>
  );
}
