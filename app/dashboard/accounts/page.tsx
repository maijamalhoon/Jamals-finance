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

function getAccountTotals(
  totals: Map<string, AccountTotals>,
  accountId: string,
) {
  const current = totals.get(accountId) ?? {
    inflow: 0,
    outflow: 0,
  };

  totals.set(accountId, current);
  return current;
}

export default async function AccountsPage() {
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    { data: transactions, error: transactionsError },
    { data: transfers, error: transfersError },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("transactions").select("account_id, type, amount"),
    supabase
      .from("account_transfers")
      .select("from_account_id, to_account_id, amount"),
  ]);

  const pageErrors = [
    accountsError,
    transactionsError,
    transfersError,
  ].filter(Boolean);

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

    const current = getAccountTotals(accountTotals, transaction.account_id);
    const amount = Number(transaction.amount ?? 0);

    if (transaction.type === "income" || transaction.type === "refund") {
      current.inflow += amount;
    }

    if (transaction.type === "expense" || transaction.type === "investment") {
      current.outflow += amount;
    }
  });

  (transfers ?? []).forEach((transfer) => {
    const amount = Number(transfer.amount ?? 0);

    if (transfer.to_account_id) {
      getAccountTotals(accountTotals, transfer.to_account_id).inflow += amount;
    }

    if (transfer.from_account_id) {
      getAccountTotals(accountTotals, transfer.from_account_id).outflow += amount;
    }
  });

  const accountGridClass =
    "grid w-full auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5";

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
        <div className="py-3 sm:py-6">
          <EmptyState
            icon={Landmark}
            title="No accounts yet"
            description="Add your first account to see balances and activity here."
            action={
              <AddAccountButton label="Add an account" showIcon={false} />
            }
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
