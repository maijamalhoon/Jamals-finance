import type { ComponentProps } from "react";

import TransactionPagination from "@/components/transactions/TransactionPagination";
import TransactionRow from "@/components/transactions/TransactionRow";
import type { PaginationState } from "@/lib/pagination";

type TransactionListRow = ComponentProps<typeof TransactionRow>["tx"];

type ViewportTransactionListProps = {
  transactions: TransactionListRow[];
  pagination: PaginationState;
  basePath: string;
  baseQuery?: string;
  groupByMonth?: boolean;
};

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
  pagination,
  basePath,
  baseQuery,
  groupByMonth = true,
}: ViewportTransactionListProps) {
  const groupedTransactions = transactions.reduce<
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

  return (
    <>
      <div className={groupByMonth ? "space-y-4" : "space-y-1"}>
        {groupByMonth ? (
          groupedTransactions.map((group) => (
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
          ))
        ) : (
          transactions.map((transaction) => (
            <TransactionRow
              key={`${transaction.type ?? "transaction"}:${transaction.id}`}
              tx={transaction}
            />
          ))
        )}
      </div>

      <TransactionPagination
        {...pagination}
        basePath={basePath}
        baseQuery={baseQuery}
        itemLabel="transactions"
      />
    </>
  );
}
