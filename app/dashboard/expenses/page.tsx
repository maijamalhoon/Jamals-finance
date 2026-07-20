import { createClient } from "@/lib/supabase/server";
import TransactionRow from "@/components/transactions/TransactionRow";
import AddExpenseButton from "@/components/expenses/AddExpenseButton";
import EmptyState from "@/components/ui/empty-state";
import Money from "@/components/currency/Money";
import { Landmark, TrendingDown } from "lucide-react";
import { loadTransactions } from "@/lib/transactions";
import { formatDateKey, getAppDateParts } from "@/lib/dates";
import { getPaginationState } from "@/lib/pagination";
import TransactionPagination from "@/components/transactions/TransactionPagination";

export const dynamic = "force-dynamic";

function isValidCategoryHex(color: string | null | undefined): color is string {
  return (
    typeof color === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color)
  );
}

function getCategoryColor(color: string | null | undefined) {
  return isValidCategoryHex(color) ? color : "var(--expense)";
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }> | { page?: string };
}) {
  const supabase = await createClient();
  const now = getAppDateParts();
  const { page } = (await Promise.resolve(searchParams)) ?? {};

  const firstDayMonth = formatDateKey(now.year, now.month, 1);
  const firstDayYear = `${now.year}-01-01`;

  const raw = await loadTransactions(supabase, { type: "expense" });

  const expenses = raw ?? [];
  const pagination = getPaginationState(expenses.length, page, 20);
  const visibleExpenses = expenses.slice(
    pagination.startIndex,
    pagination.endIndex,
  );
  const thisMonthEntries = expenses.filter((transaction) =>
    transaction.date >= firstDayMonth,
  );
  const thisMonth = thisMonthEntries.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0,
  );
  const thisYear = expenses
    .filter((transaction) => transaction.date >= firstDayYear)
    .reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  const byMonth: Record<string, number> = {};
  expenses.forEach((transaction) => {
    const month = transaction.date.slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + Number(transaction.amount);
  });
  const highestMonth = Math.max(0, ...Object.values(byMonth));

  const categoryMap = new Map<
    string,
    { id: string; name: string; amount: number; color: string; count: number }
  >();

  thisMonthEntries.forEach((transaction) => {
    const category = transaction.categories as any;
    const key = category?.id || "uncategorized";
    const name =
      category?.parent?.name
        ? `${category.parent.name} / ${category.name}`
        : category?.name || "Other";
    const color = getCategoryColor(category?.color);

    if (!categoryMap.has(key)) {
      categoryMap.set(key, { id: key, name, amount: 0, color, count: 0 });
    }

    const current = categoryMap.get(key);
    if (current) {
      current.amount += Number(transaction.amount);
      current.count += 1;
    }
  });

  const categories = Array.from(categoryMap.values()).sort(
    (left, right) => right.amount - left.amount,
  );

  return (
    <div data-expenses-page className="space-y-5">
      <div className="page-heading finance-surface-glass expenses-page-heading">
        <div className="min-w-0">
          <h2 className="page-title">Expenses</h2>
          <p className="page-subtitle">{expenses.length} total entries</p>
        </div>
        <AddExpenseButton />
      </div>

      <div
        data-mobile-summary-grid
        className="grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        <div className="summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            This Month
          </p>
          <p className="break-words text-xl font-bold text-text-primary">
            <Money amount={thisMonth} />
          </p>
        </div>

        <div className="summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            This Year
          </p>
          <p className="break-words text-xl font-bold text-text-primary">
            <Money amount={thisYear} />
          </p>
        </div>

        <div className="summary-card col-span-2 min-w-0 border-danger/30 bg-danger/10 sm:col-span-1">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            Highest Month Ever
          </p>
          <p className="break-words text-xl font-bold text-danger">
            <Money amount={highestMonth} />
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Your highest spending month
          </p>
        </div>
      </div>

      <div className="finance-panel p-5">
        <h3 className="mb-4 text-sm font-semibold text-text-primary">
          Expenses by Account
        </h3>
        {expenses.length === 0 ? (
          <EmptyState
            compact
            icon={Landmark}
            title="No account spending yet"
            description="Expense totals by account will appear after your first spend is recorded."
          />
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {Object.entries(
              expenses.reduce<Record<string, number>>((accounts, transaction) => {
                const account =
                  (transaction.accounts as any)?.name || "No account";
                accounts[account] =
                  (accounts[account] ?? 0) + Number(transaction.amount);
                return accounts;
              }, {}),
            ).map(([account, amount]) => (
              <div
                key={account}
                className="finance-panel-soft min-w-0 p-3"
              >
                <p className="truncate text-xs font-medium text-text-secondary">
                  {account}
                </p>
                <p className="mt-1 break-words text-sm font-bold text-danger">
                  <Money amount={amount} />
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="finance-panel p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">
            This Month by Category
          </h3>
          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="mb-1.5 grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(5rem,auto)] items-start gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      aria-hidden="true"
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ background: category.color }}
                    />
                    <span className="min-w-0 break-words text-sm font-medium text-text-primary [overflow-wrap:anywhere]">
                      {category.name}
                    </span>
                    <span className="shrink-0 text-xs text-text-secondary">
                      {category.count} {category.count === 1 ? "entry" : "entries"}
                    </span>
                  </div>
                  <span className="min-w-0 break-words text-right text-[13px] font-semibold leading-tight text-danger [overflow-wrap:anywhere] sm:text-sm">
                    <Money amount={category.amount} />
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-secondary">
                  <div
                    className="motion-progress-fill h-full rounded-full transition-all"
                    style={{
                      width: `${thisMonth > 0 ? (category.amount / thisMonth) * 100 : 0}%`,
                      background: category.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="finance-panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-text-primary">
            All Expenses
          </h3>
          <span className="text-xs font-medium text-text-secondary">
            {expenses.length === 0
              ? "0 entries"
              : `${pagination.startIndex + 1}-${pagination.endIndex} of ${expenses.length}`}
          </span>
        </div>

        <div className="desktop-list-header mb-1">
          <div className="w-10 flex-shrink-0" />
          <p className="flex-1">Description</p>
          <p className="w-32">Category</p>
          <p className="w-20 text-center">Type</p>
          <p className="w-32 text-right">Amount</p>
          <p className="w-24 text-right">Date</p>
          <div className="w-16 flex-shrink-0" />
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No expense records yet"
            description="Record your first expense to unlock category breakdowns and spend patterns."
          />
        ) : (
          <>
            <div className="space-y-1">
              {visibleExpenses.map((transaction) => (
                <TransactionRow key={transaction.id} tx={transaction as any} />
              ))}
            </div>
            <TransactionPagination
              {...pagination}
              basePath="/dashboard/expenses"
              itemLabel="expense entries"
            />
          </>
        )}
      </div>
    </div>
  );
}
