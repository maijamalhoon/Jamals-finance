import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  compact?: boolean;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  compact = false,
  actionHref,
  actionLabel,
  className = "",
}: EmptyStateProps) {
  const hasAction = Boolean(actionHref && actionLabel);

  return (
    <div
      data-empty-state
      data-empty-state-size={compact ? "compact" : "default"}
      className={`motion-empty mx-auto flex w-full max-w-[38rem] flex-col items-center justify-center px-4 text-center ${
        compact
          ? "min-h-[116px] py-5 sm:min-h-[128px] sm:py-6"
          : "min-h-[168px] py-8 sm:min-h-[184px] sm:py-9"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`mb-2.5 grid shrink-0 place-items-center text-primary ${
          compact ? "size-8" : "size-9 sm:size-10"
        }`}
      >
        <Icon size={compact ? 20 : 22} strokeWidth={2.15} />
      </span>

      <p className="max-w-full text-balance text-sm font-semibold leading-5 text-text-primary sm:text-[15px]">
        {title}
      </p>
      <p className="mt-1.5 max-w-[40ch] text-pretty text-xs leading-5 text-text-secondary sm:text-[13px] sm:leading-[1.45rem]">
        {description}
      </p>

      {hasAction ? (
        <Link
          href={actionHref!}
          className="finance-focus mt-4 inline-flex min-h-9 items-center justify-center rounded-[10px] bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-primary-hover hover:shadow-[var(--shadow-soft)] active:scale-[0.98]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
