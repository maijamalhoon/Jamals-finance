import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
  action?: ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  action,
  actionHref,
  actionLabel,
  className = "",
}: EmptyStateProps) {
  const linkedAction = actionHref && actionLabel ? (
    <Link href={actionHref} data-empty-state-link className="finance-focus">
      {actionLabel}
    </Link>
  ) : null;
  const renderedAction = action ?? linkedAction;

  return (
    <div
      data-empty-state
      data-empty-state-size={compact ? "compact" : "default"}
      data-empty-state-has-action={renderedAction ? "true" : "false"}
      data-empty-state-has-icon={Icon ? "true" : "false"}
      className={`motion-empty mx-auto flex w-full max-w-[38rem] min-w-0 flex-col items-center justify-center px-4 text-center ${
        compact
          ? "min-h-[116px] py-5 sm:min-h-[128px] sm:py-6"
          : "min-h-[168px] py-8 sm:min-h-[184px] sm:py-9"
      } ${className}`}
    >
      <div data-empty-state-content className="flex w-full min-w-0 flex-col items-center">
        {Icon ? (
          <span data-empty-state-icon aria-hidden="true">
            <Icon strokeWidth={2.15} />
          </span>
        ) : null}

        <p data-empty-state-title>{title}</p>
        <p data-empty-state-description>{description}</p>

        {renderedAction ? (
          <div data-empty-state-action>{renderedAction}</div>
        ) : null}
      </div>
    </div>
  );
}
