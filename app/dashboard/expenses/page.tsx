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
import "./expenses-polish.css";

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
  const thisMonthEntries = expenses.filter((t) => t.date >= firstDayMonth);
  const thisMonth = thisMonthEntries.reduce(
    (s, t) => s + Number(t.amount),
    0,
  );
  const thisYear = expenses
    .filter((t) => t.date >= firstDayYear)
    .reduce((s, t) => s + Number(t.amount), 0);

  const byMonth: Record<string, number> = {};
  expenses.forEach((t) => {
    const month = t.date.slice(0, 7);
    byMonth[month] = (byMonth[month] || 0) + Number(t.amount);
  });
  const highestMonth = Math.max(0, ...Object.values(byMonth));

  const categoryMap = new Map<
    string,
    { id: string; name: string; amount: number; color: string; count: number }
  >();
  thisMonthEntries.forEach((t) => {
    const category = t.categories as any;
    const key = category?.id || "uncategorized";
    const name =
      category?.parent?.name ? `${category.parent.name} / ${category.name}`
      : category?.name || "Other";
    const color = getCategoryColor(category?.color);
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { id: key, name, amount: 0, color, count: 0 });
    }
    const current = categoryMap.get(key);
    if (current) {
      current.amount += Number(t.amount);
      current.count++;
    }
  });

  const categories = Array.from(categoryMap.values())
    .sort((a, b) => b.amount - a.amount);

  return (
    <div data-expenses-page className="expenses-page">
      <header className="expenses-hero page-heading finance-surface-glass">
        <div className="min-w-0">
          <h2 className="page-title">Expenses</h2>
          <p className="page-subtitle">{expenses.length} total entries</p>
        </div>
        <AddExpenseButton />
      </header>

      <section
        data-mobile-summary-grid
        className="expenses-summary-grid"
        aria-label="Expense overview"
      >
        <article className="expenses-summary-card summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            This Month
          </p>
          <p className="expenses-summary-amount break-words text-xl font-bold text-text-primary">
            <Money amount={thisMonth} />
          </p>
        </article>

        <article className="expenses-summary-card summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            This Year
          </p>
          <p className="expenses-summary-amount break-words text-xl font-bold text-text-primary">
            <Money amount={thisYear} />
          </p>
        </article>

        <article className="expenses-summary-card expenses-summary-card-featured summary-card min-w-0">
          <p className="mb-1.5 text-xs font-semibold text-text-secondary">
            Highest Month Ever
          </p>
          <p className="expenses-summary-amount break-words text-xl font-bold text-danger">
            <Money amount={highestMonth} />
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            Your most expensive month
          </p>
        </article>
      </section>

      <div className="expenses-insights-grid">
        <section className="expenses-section-panel finance-panel">
          <div className="expenses-section-heading">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-text-primary">
                Expenses by Account
              </h3>
              <p className="expenses-section-copy text-xs text-text-secondary">
                Where your recorded spending came from
              </p>
            </div>
          </div>

          {expenses.length === 0 ? (
            <EmptyState
              compact
              icon={Landmark}
              title="No account spending yet"
              description="Expense totals by account will appear after your first spend is recorded."
            />
          ) : (
            <div className="expenses-account-grid">
              {Object.entries(
                expenses.reduce<Record<string, number>>((acc, tx) => {
                  const account = (tx.accounts as any)?.name || "No account";
                  acc[account] = (acc[account] ?? 0) + Number(tx.amount);
                  return acc;
                }, {}),
              ).map(([account, amount]) => (
                <article
                  key={account}
                  className="expenses-account-item finance-panel-soft min-w-0"
                >
                  <p className="truncate text-xs font-medium text-text-secondary">
                    {account}
                  </p>
                  <p className="expenses-account-amount break-words text-sm font-bold text-danger">
                    <Money amount={amount} />
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>

        {categories.length > 0 && (
          <section className="expenses-section-panel finance-panel">
            <div className="expenses-section-heading">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-text-primary">
                  This Month by Category
                </h3>
                <p className="expenses-section-copy text-xs text-text-secondary">
                  Your month-to-date spending mix
                </p>
              </div>
            </div>

            <div className="expenses-category-list">
              {categories.map((category) => (
                <article className="expenses-category-item" key={category.id}>
                  <div className="expenses-category-meta">
                    <div className="flex min-w-0 items-center gap-2">
                      <div
                        aria-hidden="true"
                        className="h-2 w-2 flex-shrink-0 rounded-full"
                        style={{ background: category.color }}
                      />
                      <span className="min-w-0 break-words text-sm font-medium text-text-primary [overflow-wrap:anywhere]">
                        {category.name}
                      </span>
                      <span className="expenses-category-count shrink-0 text-xs text-text-secondary">
                        {category.count}{" "}
                        {category.count === 1 ? "entry" : "entries"}
                      </span>
                    </div>
                    <span className="min-w-0 break-words text-right text-[13px] font-semibold leading-tight text-danger [overflow-wrap:anywhere] sm:text-sm">
                      <Money amount={category.amount} />
                    </span>
                  </div>
                  <div className="expenses-progress-track">
                    <div
                      className="motion-progress-fill h-full rounded-full transition-all"
                      style={{
                        width: `${thisMonth > 0 ? (category.amount / thisMonth) * 100 : 0}%`,
                        background: category.color,
                      }}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="expenses-ledger finance-panel">
        <div className="expenses-ledger-heading">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">
              All Expenses
            </h3>
            <p className="expenses-section-copy text-xs text-text-secondary">
              Your complete expense history
            </p>
          </div>
          <span className="expenses-entry-count text-xs font-medium text-text-secondary">
            {expenses.length === 0
              ? "0 entries"
              : `${pagination.startIndex + 1}-${pagination.endIndex} of ${expenses.length}`}
          </span>
        </div>

        {expenses.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No expense records yet"
            description="Record your first expense to unlock category breakdowns and spend patterns."
          />
        ) : (
          <>
            <div className="expenses-ledger-list">
              {visibleExpenses.map((tx) => (
                <TransactionRow key={tx.id} tx={tx as any} />
              ))}
            </div>
            <TransactionPagination
              {...pagination}
              basePath="/dashboard/expenses"
              itemLabel="expense entries"
            />
          </>
        )}
      </section>
    </div>
  );
}
