import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import TransactionTypeOverview from "@/components/transactions/TransactionTypeOverview";
import EmptyState from "@/components/ui/empty-state";
import { getAppDateParts } from "@/lib/dates";
import { getPaginationState } from "@/lib/pagination";
import { createClient } from "@/lib/supabase/server";
import { buildTransactionPageSummary } from "@/lib/transaction-page-summary";
import { loadTransactions, type LoadedTransaction } from "@/lib/transactions";
import { TrendingDown } from "lucide-react";

export const dynamic = "force-dynamic";

function validColor(value: string | null | undefined) {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : "var(--danger)";
}

function expenseCategory(transaction: LoadedTransaction) {
  const category = transaction.categories;
  const parentName = category?.parent?.name?.trim();
  const categoryName = category?.name?.trim() || "Other";
  const name = parentName ? `${parentName} / ${categoryName}` : categoryName;

  return {
    id: category?.id?.trim() || "uncategorized",
    name,
    color: validColor(category?.color),
  };
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}) {
  const supabase = await createClient();
  const now = getAppDateParts();
  const { page } = (await Promise.resolve(searchParams)) ?? {};
  const expenses = await loadTransactions(supabase, { type: "expense" });

  if (expenses.length === 0) {
    return (
      <div className="space-y-5" data-expenses-page>
        <AddExpenseButton />
        <div className="py-3 sm:py-6">
          <EmptyState
            icon={TrendingDown}
            title="No expenses yet"
            description="Add your first expense to start your monthly overview and history."
          />
        </div>
      </div>
    );
  }

  const pagination = getPaginationState(expenses.length, page, 20);
  const visibleExpenses = expenses.slice(
    pagination.startIndex,
    pagination.endIndex,
  );
  const summary = buildTransactionPageSummary(
    expenses,
    now,
    expenseCategory,
  );

  return (
    <div data-expenses-page>
      <TransactionTypeOverview
        tone="expense"
        action={<AddExpenseButton />}
        thisMonth={summary.thisMonth}
        thisYear={summary.thisYear}
        recordMonthAmount={summary.recordMonthAmount}
        recordMonthLabel={summary.recordMonthLabel}
        thisMonthEntryCount={summary.thisMonthEntryCount}
        monthlySeries={summary.monthlySeries}
        breakdownTitle="Spending categories"
        breakdownLabel="Category"
        breakdownItems={summary.breakdownItems}
        accountItems={summary.accountItems}
        visibleTransactions={visibleExpenses}
        totalTransactions={expenses.length}
        pagination={pagination}
        basePath="/dashboard/expenses"
      />
    </div>
  );
}
