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
      className={`motion-empty flex flex-col items-center justify-center text-center ${
        compact ? "py-7" : "py-14 sm:py-16"
      }`}
    >
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-[18px] border border-border bg-muted text-muted-foreground shadow-theme">
        <Icon size={18} />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
