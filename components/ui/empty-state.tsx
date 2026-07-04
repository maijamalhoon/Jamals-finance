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
      data-empty-state
      className={`motion-empty mx-auto flex w-full max-w-xl flex-col items-center justify-center px-4 text-center ${
        compact ? "min-h-[168px] py-7" : "min-h-[240px] py-12 sm:py-14"
      }`}
    >
      <div className="finance-icon-bubble mb-3 h-12 w-12 shadow-[var(--shadow)]">
        <Icon size={18} />
      </div>
      <p className="max-w-full text-balance text-sm font-semibold text-text-primary">
        {title}
      </p>
      <p className="mt-1 max-w-sm text-pretty text-xs leading-5 text-text-secondary">
        {description}
      </p>
    </div>
  );
}
