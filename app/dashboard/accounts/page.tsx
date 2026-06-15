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
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-xl font-semibold">Accounts</h2>
          <p className="text-gray-500 text-sm mt-1">
            {accounts?.length ?? 0} accounts · Total PKR{" "}
            {totalBalance.toLocaleString()}
          </p>
        </div>
        <AddAccountButton />
      </div>

      {/* Cards */}
      {!accounts?.length ?
        <div className="bg-gray-900/60 border border-gray-800/50 rounded-2xl p-16 text-center">
          <p className="text-gray-600 text-sm">No accounts yet</p>
          <p className="text-gray-700 text-xs mt-1">
            Click "Add Account" to get started
          </p>
        </div>
      : <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} />
          ))}
        </div>
      }
    </div>
  );
}
