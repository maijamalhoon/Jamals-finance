import {
  parseDateKey,
  toFiniteNumber,
  type AnalyticsTransactionData,
  type DateRange,
} from "@/lib/analytics/calculations";

export interface AnalyticsTransferData {
  id: string;
  amount: number;
  date: string;
  fromAccountId: string | null;
  fromAccountName: string | null;
  toAccountId: string | null;
  toAccountName: string | null;
}

export interface AccountActivityItem {
  id: string;
  name: string;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
}

const UNKNOWN_ACCOUNT = "Unknown account";

function positiveAmount(value: unknown) {
  const parsed = toFiniteNumber(value);
  return parsed !== null && parsed > 0 ? parsed : 0;
}

function isDateInRange(date: string, range: DateRange) {
  const parsed = parseDateKey(date);
  if (!parsed) return false;
  return date >= range.start && date <= range.end;
}

export function buildAccountActivity(
  transactions: ReadonlyArray<AnalyticsTransactionData>,
  transfers: ReadonlyArray<AnalyticsTransferData>,
  range: DateRange,
): AccountActivityItem[] {
  const accounts = new Map<string, AccountActivityItem>();

  const ensureAccount = (id: string, name: string | null | undefined) => {
    const cleanName = name?.trim() || UNKNOWN_ACCOUNT;
    const current = accounts.get(id);
    if (current) {
      if (current.name === UNKNOWN_ACCOUNT && cleanName !== UNKNOWN_ACCOUNT) {
        current.name = cleanName;
      }
      return current;
    }

    const next: AccountActivityItem = {
      id,
      name: cleanName,
      income: 0,
      expenses: 0,
      transfersIn: 0,
      transfersOut: 0,
    };
    accounts.set(id, next);
    return next;
  };

  transactions.forEach((transaction) => {
    if (!isDateInRange(transaction.date, range)) return;
    const accountId = transaction.accountId?.trim();
    if (!accountId) return;

    const amount = positiveAmount(transaction.amount);
    if (amount === 0) return;

    const account = ensureAccount(accountId, transaction.accountName);
    const type = transaction.type.trim().toLowerCase();
    if (type === "income") account.income += amount;
    if (type === "expense") account.expenses += amount;
    if (type === "refund") account.expenses -= amount;
  });

  transfers.forEach((transfer) => {
    if (!isDateInRange(transfer.date, range)) return;
    const amount = positiveAmount(transfer.amount);
    if (amount === 0) return;

    const fromId = transfer.fromAccountId?.trim();
    if (fromId) {
      ensureAccount(fromId, transfer.fromAccountName).transfersOut += amount;
    }

    const toId = transfer.toAccountId?.trim();
    if (toId) {
      ensureAccount(toId, transfer.toAccountName).transfersIn += amount;
    }
  });

  return Array.from(accounts.values())
    .map((account) => ({
      ...account,
      expenses: Math.max(0, account.expenses),
    }))
    .sort((left, right) => {
      const leftActivity =
        left.income + left.expenses + left.transfersIn + left.transfersOut;
      const rightActivity =
        right.income + right.expenses + right.transfersIn + right.transfersOut;
      return rightActivity - leftActivity || left.name.localeCompare(right.name);
    });
}
