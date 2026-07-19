"use client";

import Link from "next/link";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";

import TransactionRow from "@/components/transactions/TransactionRow";

type TransactionListRow = ComponentProps<typeof TransactionRow>["tx"];

type ViewportTransactionListProps = {
  transactions: TransactionListRow[];
  requestedLimit: number | null;
  baseQuery: string;
  stepLimit: number;
  maxLimit: number;
};

const PAGE_VIEWPORTS = 2;
const BOTTOM_BREATHING_ROOM = 16;

function getTransactionMonthKey(value?: string | null) {
  const match = /^(\d{4})-(\d{2})/.exec(value ?? "");
  return match ? `${match[1]}-${match[2]}` : "undated";
}

function formatTransactionMonth(key: string) {
  if (key === "undated") return "No date";

  const [year, month] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  if (Number.isNaN(date.getTime())) return key;

  return date.toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ViewportTransactionList({
  transactions,
  requestedLimit,
  baseQuery,
  stepLimit,
  maxLimit,
}: ViewportTransactionListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const [viewportLimit, setViewportLimit] = useState<number | null>(
    requestedLimit,
  );

  const calculateViewportLimit = useCallback(() => {
    if (requestedLimit !== null || transactions.length === 0) return;

    const list = listRef.current;
    const firstRow = list?.querySelector<HTMLElement>("[data-transaction-row]");
    if (!list || !firstRow) return;

    const rowHeight = firstRow.getBoundingClientRect().height;
    if (!Number.isFinite(rowHeight) || rowHeight <= 0) return;

    const viewportHeight = window.innerHeight;
    const listTop = list.getBoundingClientRect().top + window.scrollY;
    const footerHeight = footerRef.current
      ? footerRef.current.getBoundingClientRect().height + 20
      : 0;
    const availableHeight = Math.max(
      rowHeight,
      viewportHeight * PAGE_VIEWPORTS -
        listTop -
        footerHeight -
        BOTTOM_BREATHING_ROOM,
    );
    const nextLimit = Math.max(
      1,
      Math.min(
        maxLimit,
        transactions.length,
        Math.floor(availableHeight / rowHeight),
      ),
    );

    setViewportLimit((current) =>
      current === nextLimit ? current : nextLimit,
    );
  }, [maxLimit, requestedLimit, transactions.length]);

  const scheduleMeasurement = useCallback(() => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      calculateViewportLimit();
    });
  }, [calculateViewportLimit]);

  useLayoutEffect(() => {
    if (requestedLimit !== null) {
      setViewportLimit(requestedLimit);
      return;
    }

    scheduleMeasurement();

    const resizeObserver = new ResizeObserver(scheduleMeasurement);
    resizeObserver.observe(document.body);

    window.addEventListener("resize", scheduleMeasurement);
    window.addEventListener("orientationchange", scheduleMeasurement);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasurement);
      window.removeEventListener("orientationchange", scheduleMeasurement);

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [requestedLimit, scheduleMeasurement]);

  const isMeasuring = requestedLimit === null && viewportLimit === null;
  const effectiveLimit = Math.min(
    requestedLimit ?? viewportLimit ?? 1,
    maxLimit,
    transactions.length,
  );
  const visibleTransactions = transactions.slice(0, effectiveLimit);
  const groupedTransactions = visibleTransactions.reduce<
    Array<{
      key: string;
      label: string;
      transactions: TransactionListRow[];
    }>
  >((groups, transaction) => {
    const key = getTransactionMonthKey(transaction.date);
    const lastGroup = groups.at(-1);

    if (lastGroup?.key === key) {
      lastGroup.transactions.push(transaction);
      return groups;
    }

    groups.push({
      key,
      label: formatTransactionMonth(key),
      transactions: [transaction],
    });
    return groups;
  }, []);
  const hasMore =
    visibleTransactions.length < transactions.length &&
    effectiveLimit < maxLimit;
  const nextLimit = Math.min(
    effectiveLimit + stepLimit,
    maxLimit,
    transactions.length,
  );
  const nextBatchSize = Math.max(
    0,
    nextLimit - visibleTransactions.length,
  );
  const nextHref = useMemo(() => {
    const query = new URLSearchParams(baseQuery);
    query.set("limit", String(nextLimit));
    return `/dashboard/transactions?${query.toString()}`;
  }, [baseQuery, nextLimit]);

  return (
    <>
      <div
        ref={listRef}
        className="space-y-4"
        style={isMeasuring ? { visibility: "hidden" } : undefined}
        aria-busy={isMeasuring || undefined}
      >
        {groupedTransactions.map((group) => (
          <section key={group.key} aria-label={`${group.label} transactions`}>
            <div className="px-2 pb-1 text-[11px] font-black uppercase tracking-[0.14em] text-text-secondary sm:px-3">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.transactions.map((transaction) => (
                <TransactionRow
                  key={`${transaction.type ?? "transaction"}:${transaction.id}`}
                  tx={transaction}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {hasMore || (isMeasuring && transactions.length > 1) ? (
        <div
          ref={footerRef}
          className="mt-5 flex flex-col items-center justify-center gap-2 border-t border-border pt-5"
          style={isMeasuring ? { visibility: "hidden" } : undefined}
        >
          <Link
            href={nextHref}
            scroll={false}
            className="finance-focus inline-flex items-center justify-center rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-bold text-text-primary shadow-sm transition-all hover:-translate-y-0.5 hover:bg-hover hover:shadow-md"
          >
            Show {nextBatchSize} more
          </Link>

          <p className="text-xs text-text-secondary">
            {visibleTransactions.length} shown,{" "}
            {transactions.length - visibleTransactions.length} remaining
          </p>
        </div>
      ) : transactions.length > maxLimit ? (
        <p className="mt-5 border-t border-border pt-5 text-center text-xs text-text-secondary">
          Showing first {maxLimit}. Use filters to narrow results.
        </p>
      ) : null}
    </>
  );
}
