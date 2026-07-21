import AddIncomeButton from "@/components/income/AddIncomeButton";
import TransactionTypeOverview from "@/components/transactions/TransactionTypeOverview";
import EmptyState from "@/components/ui/empty-state";
import { getAppDateParts } from "@/lib/dates";
import { getPaginationState } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { buildTransactionPageSummary } from "@/lib/transaction-page-summary";
import { loadTransactions, type LoadedTransaction } from "@/lib/transactions";
import { TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

function validColor(value: string | null | undefined) {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : "var(--success)";
}

function incomeSource(transaction: LoadedTransaction) {
  const source = transaction.source_name?.trim();
  const category = transaction.categories;
  const name = source || category?.name?.trim() || "Other";

  return {
    id: `source:${name.toLocaleLowerCase("en")}`,
    name,
    color: validColor(category?.color),
  };
}

export default async function IncomePage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}) {
  const supabase = await createClient();
  const now = getAppDateParts();
  const { page } = (await Promise.resolve(searchParams)) ?? {};
  const income = await loadTransactions(supabase, { type: "income" });

  if (income.length === 0) {
    return (
      <div className="space-y-5">
        <AddIncomeButton />
        <div className="py-3 sm:py-6">
          <EmptyState
            icon={TrendingUp}
            title="No income yet"
            description="Add your first income to start your monthly overview and history."
          />
        </div>
      </div>
    );
  }

  const pagination = getPaginationState(income.length, page, 20);
  const visibleIncome = income.slice(
    pagination.startIndex,
    pagination.endIndex,
  );
  const summary = buildTransactionPageSummary(income, now, incomeSource);

  return (
    <TransactionTypeOverview
      tone="income"
      action={<AddIncomeButton />}
      thisMonth={summary.thisMonth}
      thisYear={summary.thisYear}
      recordMonthAmount={summary.recordMonthAmount}
      recordMonthLabel={summary.recordMonthLabel}
      thisMonthEntryCount={summary.thisMonthEntryCount}
      monthlySeries={summary.monthlySeries}
      breakdownTitle="Income sources"
      breakdownLabel="Source"
      breakdownItems={summary.breakdownItems}
      accountItems={summary.accountItems}
      visibleTransactions={visibleIncome}
      totalTransactions={income.length}
      pagination={pagination}
      basePath="/dashboard/income"
    />
  );
}
