import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountButton from "@/components/accounts/AddAccountButton";

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
        <div className="finance-panel p-12 text-center sm:p-16">
          <p className="text-sm text-slate-500">No accounts yet</p>
          <p className="mt-1 text-xs text-slate-600">
            Click "Add Account" to get started
          </p>
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
