import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionRow from "@/components/transactions/TransactionRow";
import EmptyState from "@/components/ui/empty-state";
import { ArrowLeftRight } from "lucide-react";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    search?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { type, search, from, to } = await searchParams;
  const supabase = await createClient();
  const searchTerm = search?.trim().toLowerCase();

  let query = supabase
    .from("transactions")
    .select("*, categories(name, color), accounts(name)")
    .order("date", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data: raw } = await query;

  const transactions =
    searchTerm
      ? (raw ?? []).filter(
          (t) =>
            t.note?.toLowerCase().includes(searchTerm) ||
            (t.categories as any)?.name?.toLowerCase().includes(searchTerm) ||
            (t.accounts as any)?.name?.toLowerCase().includes(searchTerm),
        )
      : (raw ?? []);

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
          <p className="w-20 text-center">Type</p>
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
