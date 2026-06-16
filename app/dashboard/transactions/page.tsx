import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import TransactionFilters from "@/components/transactions/TransactionFilters";
import TransactionRow from "@/components/transactions/TransactionRow";

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

  let query = supabase
    .from("transactions")
    .select("*, categories(name, color), accounts(name)")
    .order("date", { ascending: false });

  if (type && type !== "all") query = query.eq("type", type);
  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data: raw } = await query;

  const transactions =
    search ?
      (raw ?? []).filter(
        (t) =>
          t.note?.toLowerCase().includes(search.toLowerCase()) ||
          (t.categories as any)?.name
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          (t.accounts as any)?.name
            ?.toLowerCase()
            .includes(search.toLowerCase()),
      )
    : (raw ?? []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-white text-xl font-semibold">Transactions</h2>
        <p className="text-gray-500 text-sm mt-1">
          {transactions.length} transaction
          {transactions.length !== 1 ? "s" : ""}
          {search ? ` matching "${search}"` : ""}
          {from || to ? ` · filtered by date` : ""}
        </p>
      </div>

      <Suspense fallback={<div className="h-12 mb-5" />}>
        <TransactionFilters />
      </Suspense>

      <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-5 overflow-x-auto">
        <div className="flex items-center gap-3 pb-3 border-b border-gray-800/50 mb-1">
          <div className="w-9 flex-shrink-0" />
          <p className="flex-1 text-gray-500 text-xs font-medium uppercase tracking-wide">
            Description
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-32 hidden md:block">
            Category
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-16">
            Type
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-32 text-right">
            Amount
          </p>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide w-24 text-right">
            Date
          </p>
          <div className="w-16 flex-shrink-0" />
        </div>

        {transactions.length === 0 ?
          <div className="py-16 text-center">
            <p className="text-gray-600 text-sm">No transactions found</p>
            <p className="text-gray-700 text-xs mt-1">
              Try changing the filters
            </p>
          </div>
        : transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx as any} />
          ))
        }
      </div>
    </div>
  );
}
