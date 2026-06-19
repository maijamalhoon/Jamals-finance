import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountButton from "@/components/accounts/AddAccountButton";
import EmptyState from "@/components/ui/empty-state";
import { formatPKR } from "@/lib/finance-options";
import { WalletCards } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at", { ascending: true }),
    supabase.from("transactions").select("account_id, type, amount"),
  ]);

  const totalBalance = (accounts ?? []).reduce(
    (s, a) => s + Number(a.balance),
    0,
  );
  const accountTotals = new Map<string, { inflow: number; outflow: number }>();
  (transactions ?? []).forEach((transaction) => {
    if (!transaction.account_id) return;
    const current = accountTotals.get(transaction.account_id) ?? {
      inflow: 0,
      outflow: 0,
    };
    if (transaction.type === "income") current.inflow += Number(transaction.amount);
    if (transaction.type === "expense") current.outflow += Number(transaction.amount);
    accountTotals.set(transaction.account_id, current);
  });

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Accounts</h2>
          <p className="page-subtitle">
            {accounts?.length ?? 0} accounts - Total {formatPKR(totalBalance)}
          </p>
        </div>
        <AddAccountButton />
      </div>

      {!accounts?.length ? (
        <div className="finance-panel px-5">
          <EmptyState
            icon={WalletCards}
            title="No accounts yet"
            description="Add your cash, bank, or wallet accounts to start tracking balances."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {accounts.map((a) => (
            <AccountCard
              key={a.id}
              account={{
                ...a,
                ...(accountTotals.get(a.id) ?? { inflow: 0, outflow: 0 }),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
