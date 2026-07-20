import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountButton from "@/components/accounts/AddAccountButton";
import EmptyState from "@/components/ui/empty-state";
import { AlertTriangle, Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

type AccountTotals = {
  inflow: number;
  outflow: number;
};

export default async function AccountsPage() {
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("transactions").select("account_id, type, amount"),
  ]);

  const pageErrors = [accountsError, transactionsError].filter(Boolean);

  if (pageErrors.length > 0) {
    console.error(
      "Failed to load accounts page data",
      pageErrors.map((error) => error?.code ?? "unknown"),
    );
  }

  const safeAccounts = accounts ?? [];
  const activeAccountList = safeAccounts.filter(
    (account) => account.status !== "archived",
  );
  const archivedAccountList = safeAccounts.filter(
    (account) => account.status === "archived",
  );

  const accountTotals = new Map<string, AccountTotals>();

  (transactions ?? []).forEach((transaction) => {
    if (!transaction.account_id) return;

    const current = accountTotals.get(transaction.account_id) ?? {
      inflow: 0,
      outflow: 0,
    };

    if (transaction.type === "income") {
      current.inflow += Number(transaction.amount ?? 0);
    }

    if (transaction.type === "expense") {
      current.outflow += Number(transaction.amount ?? 0);
    }

    accountTotals.set(transaction.account_id, current);
  });

  const accountGridClass =
    "grid max-w-full auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(248px,272px))] sm:justify-start";

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <AddAccountButton />
      </div>

      {accountsError ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={AlertTriangle}
            title="Could not load accounts"
            description="Refresh the page or try again after checking your connection."
          />
        </div>
      ) : !safeAccounts.length ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={Landmark}
            title="No accounts yet"
            description="Add your first account to see balances and activity here."
            action={<AddAccountButton />}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {activeAccountList.length > 0 ? (
            <section aria-labelledby="active-accounts-heading" className="space-y-3">
              <h3 id="active-accounts-heading" className="text-sm font-bold text-text-primary">
                Active accounts
              </h3>
              <div className={accountGridClass}>
                {activeAccountList.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={{
                      ...account,
                      ...(accountTotals.get(account.id) ?? { inflow: 0, outflow: 0 }),
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {archivedAccountList.length > 0 ? (
            <section aria-labelledby="archived-accounts-heading" className="space-y-3">
              <div>
                <h3 id="archived-accounts-heading" className="text-sm font-bold text-text-primary">
                  Archived accounts
                </h3>
                <p className="text-xs text-text-secondary">
                  Read-only accounts remain available for history and reports.
                </p>
              </div>
              <div className={accountGridClass}>
                {archivedAccountList.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={{
                      ...account,
                      ...(accountTotals.get(account.id) ?? { inflow: 0, outflow: 0 }),
                    }}
                  />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
