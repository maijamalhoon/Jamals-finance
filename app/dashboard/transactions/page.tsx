import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionRow from "@/components/transactions/TransactionRow";
import EmptyState from "@/components/ui/empty-state";
import { ArrowLeftRight } from "lucide-react";
import { loadTransactions } from "@/lib/transactions";

export const dynamic = "force-dynamic";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    search?: string;
    from?: string;
    to?: string;
    source?: string;
    category?: string;
    account?: string;
    person?: string;
    item?: string;
    min?: string;
    max?: string;
  }>;
}) {
  const {
    type,
    search,
    from,
    to,
    source,
    category,
    account,
    person,
    item,
    min,
    max,
  } = await searchParams;
  const supabase = await createClient();
  const searchTerm = search?.trim().toLowerCase();
  const sourceTerm = source?.trim().toLowerCase();
  const personTerm = person?.trim().toLowerCase();
  const itemTerm = item?.trim().toLowerCase();
  const minAmount = min ? Number(min) : null;
  const maxAmount = max ? Number(max) : null;

  const raw = await loadTransactions(supabase, {
    type: type === "income" || type === "expense" ? type : undefined,
    from,
    to,
    category,
    account,
    minAmount,
    maxAmount,
  });

  const transactions =
    (raw ?? []).filter((t) => {
      const categoryName =
        (t.categories as any)?.parent?.name ?
          `${(t.categories as any).parent.name} ${(t.categories as any).name}`
        : (t.categories as any)?.name || "";
      const accountName = (t.accounts as any)?.name || "";
      const haystack = [
        t.note,
        t.source_name,
        t.person_name,
        t.item_name,
        categoryName,
        accountName,
        t.type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (searchTerm && !haystack.includes(searchTerm)) return false;
      if (sourceTerm && !String(t.source_name ?? "").toLowerCase().includes(sourceTerm)) {
        return false;
      }
      if (personTerm && !String(t.person_name ?? "").toLowerCase().includes(personTerm)) {
        return false;
      }
      if (itemTerm && !String(t.item_name ?? "").toLowerCase().includes(itemTerm)) {
        return false;
      }
      return true;
    });

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Transactions</h2>
          <p className="page-subtitle">
            {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""}
            {searchTerm ? ` matching "${search}"` : ""}
            {from || to ? " - filtered by date" : ""}
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="mb-5 h-12" />}>
        <TransactionFilters />
      </Suspense>

      <div className="finance-panel p-4 sm:p-5">
        <div className="desktop-list-header mb-1">
          <div className="w-10 flex-shrink-0" />
          <p className="flex-1">Description</p>
          <p className="w-32">Category</p>
          <p className="w-24 text-center">Type</p>
          <p className="w-32 text-right">Amount</p>
          <p className="w-24 text-right">Date</p>
          <div className="w-16 flex-shrink-0" />
        </div>

        {transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions found"
            description={
              searchTerm || from || to || type ?
                "Try relaxing the filters or searching a different category, account, or note."
              : "Add income or expenses to build your transaction history."
            }
          />
        ) : (
          transactions.map((tx) => <TransactionRow key={tx.id} tx={tx as any} />)
        )}
      </div>
    </div>
  );
}
