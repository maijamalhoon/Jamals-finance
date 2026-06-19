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
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-[18px] border border-white/[0.10] bg-white/[0.07] text-slate-300 shadow-[0_14px_34px_rgba(0,0,0,0.20)]">
        <Icon size={18} />
      </div>
      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}
