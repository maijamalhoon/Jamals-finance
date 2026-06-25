import { createClient } from "@/lib/supabase/server";
import AccountCard from "@/components/accounts/AccountCard";
import AddAccountButton from "@/components/accounts/AddAccountButton";
import EmptyState from "@/components/ui/empty-state";
import { formatPKR } from "@/lib/finance-options";
import { Landmark, WalletCards } from "lucide-react";

export const dynamic = "force-dynamic";

type AccountTotals = {
  inflow: number;
  outflow: number;
};

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: transactions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("transactions").select("account_id, type, amount"),
  ]);

  const safeAccounts = accounts ?? [];

  const totalBalance = safeAccounts.reduce(
    (sum, account) => sum + Number(account.balance ?? 0),
    0,
  );

  const activeAccounts = safeAccounts.filter(
    (account) => Number(account.balance ?? 0) > 0,
  ).length;

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
      <section
        className="relative overflow-hidden rounded-[28px] border p-4 sm:p-5"
        style={{
          borderColor: "var(--border)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--card), var(--active) 7%), var(--card))",
          boxShadow: "var(--shadow-premium, var(--shadow))",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full blur-3xl"
          style={{
            background: "color-mix(in srgb, var(--active), transparent 82%)",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in srgb, var(--active), transparent 35%), transparent)",
          }}
        />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
              <WalletCards size={14} className="text-[var(--active)]" />
              Portfolio accounts
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Accounts
            </h2>

            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {safeAccounts.length} accounts • Total {formatPKR(totalBalance)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <div
                className="rounded-2xl border px-3 py-2"
                style={{
                  borderColor:
                    "color-mix(in srgb, var(--active), transparent 76%)",
                  background:
                    "color-mix(in srgb, var(--active), transparent 92%)",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Total Balance
                </p>
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {formatPKR(totalBalance)}
                </p>
              </div>

              <div
                className="rounded-2xl border px-3 py-2"
                style={{
                  borderColor: "color-mix(in srgb, #10b981, transparent 76%)",
                  background: "color-mix(in srgb, #10b981, transparent 92%)",
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Active
                </p>
                <p className="text-sm font-bold text-emerald-600">
                  {activeAccounts}/{safeAccounts.length}
                </p>
              </div>
            </div>

            <AddAccountButton />
          </div>
        </div>
      </section>

      {!safeAccounts.length ?
        <div
          className="rounded-[28px] border px-5"
          style={{
            borderColor: "var(--border)",
            background: "var(--card)",
            boxShadow: "var(--shadow)",
          }}
        >
          <EmptyState
            icon={Landmark}
            title="No accounts yet"
            description="Add your cash, bank, or wallet accounts to start tracking balances."
          />
        </div>
      : <section className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {safeAccounts.map((account, index) => (
            <AccountCard
              key={account.id}
              index={index}
              account={{
                ...account,
                ...(accountTotals.get(account.id) ?? {
                  inflow: 0,
                  outflow: 0,
                }),
              }}
            />
          ))}
        </section>
      }
    </div>
  );
}
