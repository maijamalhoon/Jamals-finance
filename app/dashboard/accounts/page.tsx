import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountButton from "@/components/accounts/AddAccountButton";
import EmptyState from "@/components/ui/empty-state";
import Money from "@/components/currency/Money";
import { AlertTriangle, Landmark, WalletCards } from "lucide-react";

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

  const totalBalance = activeAccountList.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0,
  );

  const activeAccounts = activeAccountList.length;

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

  return (
    <div className="space-y-5">
      <section className="page-heading finance-surface-glass overflow-hidden">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-surface-secondary px-3 py-1 text-xs font-semibold text-text-secondary">
              <WalletCards size={14} className="text-active" />
              Portfolio accounts
            </div>

            <h2 className="page-title">Accounts</h2>

            <p className="page-subtitle break-words">
              {activeAccounts} active
              {archivedAccountList.length > 0
                ? ` · ${archivedAccountList.length} archived`
                : ""}
              {" · "}Total <Money amount={totalBalance} />
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-3 sm:items-start lg:items-end">
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
              <div className="summary-card min-w-0 border-active/30 bg-active/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  Total Balance
                </p>
                <p className="break-words text-sm font-bold text-text-primary">
                  <Money amount={totalBalance} />
                </p>
              </div>

              <div className="summary-card min-w-0 border-success/30 bg-success/10 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                  Active
                </p>
                <p className="break-words text-sm font-bold text-success">
                  {activeAccounts}
                </p>
              </div>
            </div>

            <AddAccountButton />
          </div>
        </div>
      </section>

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
            description="Add your cash, bank, or wallet accounts to start tracking balances."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {activeAccountList.length > 0 ? (
            <section aria-labelledby="active-accounts-heading" className="space-y-3">
              <h3 id="active-accounts-heading" className="text-sm font-bold text-text-primary">
                Active accounts
              </h3>
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
