import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PaginationState } from "@/lib/pagination";

type TransactionPaginationProps = Pick<
  PaginationState,
  "currentPage" | "endIndex" | "startIndex" | "totalItems" | "totalPages"
> & {
  basePath: string;
  itemLabel: string;
};

function pageHref(basePath: string, page: number) {
  return page === 1 ? basePath : `${basePath}?page=${page}`;
}

export default function TransactionPagination({
  basePath,
  currentPage,
  endIndex,
  itemLabel,
  startIndex,
  totalItems,
  totalPages,
}: TransactionPaginationProps) {
  if (totalItems === 0 || totalPages === 1) return null;

  const linkClassName =
    "finance-focus inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-[var(--radius-button)] border border-border bg-surface px-3 text-sm font-bold text-text-primary shadow-[var(--shadow-xs)] transition-[background-color,border-color,transform] hover:border-border-strong hover:bg-hover active:translate-y-px";
  const disabledClassName =
    "inline-flex min-h-11 min-w-11 cursor-not-allowed items-center justify-center gap-1 rounded-[var(--radius-button)] border border-border bg-surface-secondary px-3 text-sm font-bold text-text-tertiary opacity-60";

  return (
    <nav
      aria-label={`${itemLabel} pagination`}
      className="mt-5 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-xs font-medium text-text-secondary" aria-live="polite">
        Showing {startIndex + 1}-{endIndex} of {totalItems} {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={pageHref(basePath, currentPage - 1)}
            className={linkClassName}
            aria-label={`Previous ${itemLabel} page`}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="hidden min-[360px]:inline">Previous</span>
          </Link>
        ) : (
          <span className={disabledClassName} aria-disabled="true">
            <ChevronLeft size={16} aria-hidden="true" />
            <span className="hidden min-[360px]:inline">Previous</span>
          </span>
        )}

        <span className="min-w-[5.5rem] text-center text-xs font-semibold text-text-secondary">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={pageHref(basePath, currentPage + 1)}
            className={linkClassName}
            aria-label={`Next ${itemLabel} page`}
          >
            <span className="hidden min-[360px]:inline">Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : (
          <span className={disabledClassName} aria-disabled="true">
            <span className="hidden min-[360px]:inline">Next</span>
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
