import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountButton from "@/components/accounts/AddAccountButton";
import EmptyState from "@/components/ui/empty-state";
import { WalletCards } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true });

  const totalBalance = (accounts ?? []).reduce(
    (s, a) => s + Number(a.balance),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2 className="page-title">Accounts</h2>
          <p className="page-subtitle">
            {accounts?.length ?? 0} accounts - Total PKR{" "}
            {totalBalance.toLocaleString()}
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
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      )}
    </div>
  );
}
