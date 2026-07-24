import AccountsLiveGrid, {
  type AccountGridAccount,
  type AccountLinkedInvestment,
} from "@/components/accounts/AccountsLiveGrid";
import AddAccountButton from "@/components/accounts/AddAccountButton";
import EmptyState from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, Landmark } from "lucide-react";

export const dynamic = "force-dynamic";

type AccountTotals = {
  inflow: number;
  outflow: number;
};

type AccountTransactionRow = {
  account_id: string | null;
  type: string;
  amount: number | string | null;
  investment_id: string | null;
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

function safePositive(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export default async function AccountsPage() {
  const supabase = await createClient();

  const [
    { data: accounts, error: accountsError },
    { data: transactions, error: transactionsError },
    { data: transfers, error: transfersError },
    { data: investments, error: investmentsError },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("account_id, type, amount, investment_id")
      .is("deleted_at", null),
    supabase
      .from("account_transfers")
      .select("from_account_id, to_account_id, amount")
      .is("deleted_at", null),
    supabase
      .from("investments")
      .select(
        "id, name, type, quantity, purchase_price, current_price, purchased_at, asset_id, symbol, image_url, price_source, current_price_original, current_price_currency, price_updated_at, price_change_24h, is_live_priced",
      )
      .order("created_at", { ascending: false }),
  ]);

  const pageErrors = [
    accountsError,
    transactionsError,
    transfersError,
    investmentsError,
  ].filter(Boolean);

  if (pageErrors.length > 0) {
    console.error(
      "Failed to load accounts page data",
      pageErrors.map((error) => error?.code ?? "unknown"),
    );
  }

  const safeAccounts = accounts ?? [];
  const accountTotals = new Map<string, AccountTotals>();
  const investmentAccountIds = new Map<string, string>();

  ((transactions ?? []) as AccountTransactionRow[]).forEach((transaction) => {
    if (!transaction.account_id) return;

    const current = getAccountTotals(accountTotals, transaction.account_id);
    const amount = safePositive(transaction.amount);
    if (amount <= 0) return;

    if (transaction.type === "income" || transaction.type === "refund") {
      current.inflow += amount;
    }

    if (transaction.type === "expense" || transaction.type === "investment") {
      current.outflow += amount;
    }

    if (transaction.type === "investment" && transaction.investment_id) {
      investmentAccountIds.set(
        transaction.investment_id,
        transaction.account_id,
      );
    }
  });

  (transfers ?? []).forEach((transfer) => {
    const amount = safePositive(transfer.amount);
    if (amount <= 0) return;

    if (transfer.to_account_id) {
      getAccountTotals(accountTotals, transfer.to_account_id).inflow += amount;
    }

    if (transfer.from_account_id) {
      getAccountTotals(accountTotals, transfer.from_account_id).outflow += amount;
    }
  });

  const accountsWithTotals = safeAccounts.map((account) => ({
    ...account,
    ...(accountTotals.get(account.id) ?? { inflow: 0, outflow: 0 }),
  })) as AccountGridAccount[];

  const activeAccountList = accountsWithTotals.filter(
    (account) => account.status !== "archived",
  );
  const archivedAccountList = accountsWithTotals.filter(
    (account) => account.status === "archived",
  );

  const linkedInvestments = investmentsError
    ? []
    : ((investments ?? []).map((investment) => ({
        ...investment,
        account_id: investmentAccountIds.get(investment.id) ?? null,
      })) as AccountLinkedInvestment[]);

  return (
    <div data-accounts-page className="space-y-5 pb-8">
      <div data-page-action-row className="flex justify-end">
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
        <AccountsLiveGrid
          activeAccounts={activeAccountList}
          archivedAccounts={archivedAccountList}
          investments={linkedInvestments}
        />
      )}
    </div>
  );
}
