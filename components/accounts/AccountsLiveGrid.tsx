"use client";

import { useMemo } from "react";

import AccountCard from "@/components/accounts/AccountCard";
import type { ExistingAccount } from "@/components/accounts/AccountModal";
import { useLiveInvestmentRows } from "@/components/investments/useLiveInvestmentRows";

export type AccountGridAccount = ExistingAccount & {
  inflow?: number;
  outflow?: number;
};

export type AccountLinkedInvestment = {
  id: string;
  account_id: string | null;
  name: string;
  type: string;
  quantity: number | string;
  purchase_price: number | string;
  current_price: number | string;
  purchased_at?: string | null;
  asset_id?: string | null;
  symbol?: string | null;
  image_url?: string | null;
  price_source?: string | null;
  current_price_original?: number | string | null;
  current_price_currency?: string | null;
  price_updated_at?: string | null;
  price_change_24h?: number | null;
  is_live_priced?: boolean | null;
};

function getInvestmentValuesByAccount(investments: AccountLinkedInvestment[]) {
  const totals = new Map<string, number>();

  for (const investment of investments) {
    if (!investment.account_id) continue;
    const quantity = Number(investment.quantity);
    const currentPrice = Number(investment.current_price);
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      continue;
    }

    totals.set(
      investment.account_id,
      (totals.get(investment.account_id) ?? 0) + quantity * currentPrice,
    );
  }

  return totals;
}

function sortAccountsByBalance(accounts: AccountGridAccount[]) {
  return [...accounts].sort(
    (first, second) => Number(second.balance ?? 0) - Number(first.balance ?? 0),
  );
}

export default function AccountsLiveGrid({
  activeAccounts,
  archivedAccounts,
  investments,
}: {
  activeAccounts: AccountGridAccount[];
  archivedAccounts: AccountGridAccount[];
  investments: AccountLinkedInvestment[];
}) {
  const liveInvestments = useLiveInvestmentRows(investments);
  const valuesByAccount = useMemo(
    () => getInvestmentValuesByAccount(liveInvestments),
    [liveInvestments],
  );
  const sortedActiveAccounts = useMemo(
    () => sortAccountsByBalance(activeAccounts),
    [activeAccounts],
  );
  const sortedArchivedAccounts = useMemo(
    () => sortAccountsByBalance(archivedAccounts),
    [archivedAccounts],
  );
  const accountGridClass =
    "grid w-full auto-rows-fr grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className="space-y-6">
      {sortedActiveAccounts.length > 0 ? (
        <section aria-labelledby="active-accounts-heading" className="space-y-3">
          <h3
            id="active-accounts-heading"
            className="text-sm font-bold text-text-primary"
          >
            Active accounts
          </h3>
          <div className={accountGridClass}>
            {sortedActiveAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                investmentValue={valuesByAccount.get(account.id) ?? 0}
              />
            ))}
          </div>
        </section>
      ) : null}

      {sortedArchivedAccounts.length > 0 ? (
        <section aria-labelledby="archived-accounts-heading" className="space-y-3">
          <div>
            <h3
              id="archived-accounts-heading"
              className="text-sm font-bold text-text-primary"
            >
              Archived accounts
            </h3>
            <p className="text-xs text-text-secondary">
              Read-only accounts remain available for history and reports.
            </p>
          </div>
          <div className={accountGridClass}>
            {sortedArchivedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                investmentValue={valuesByAccount.get(account.id) ?? 0}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
